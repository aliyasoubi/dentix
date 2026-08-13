import { Inject, Injectable } from "@nestjs/common";
import { asUuid, fail, ok, Result, Uuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent, AUDIT_EVENT_REPOSITORY } from "../../../audit/public-api";
import type { AuditEventRepository } from "../../../audit/public-api";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { UserAccount } from "../../domain/entities/user-account.entity";
import { OFFICE_USER_REPOSITORY } from "../../domain/repositories/office-user.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { USER_ACCOUNT_REPOSITORY } from "../../domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import { isWithinRecentAuthenticationWindow } from "../../domain/value-objects/session-policy";
import { KEYCLOAK_ADMIN_PORT } from "../ports/keycloak-admin.port";
import type { KeycloakAdminPort } from "../ports/keycloak-admin.port";
import { UNIT_OF_WORK_PORT } from "../../../../platform/unit-of-work.port";
import type { UnitOfWorkPort } from "../../../../platform/unit-of-work.port";

export type AddOfficeUserErrorCode =
  | "FORBIDDEN"
  | "RECENT_AUTHENTICATION_REQUIRED"
  | "INVALID_EMAIL"
  | "NOT_FOUND_IN_PROVIDER"
  | "PROVIDER_ACCOUNT_DISABLED"
  | "ALREADY_LINKED";

export interface AddOfficeUserCommand {
  readonly officeId: Uuid;
  readonly actorUserId: Uuid;
  readonly email: string;
  /** The acting session's `authenticatedAt` — see the recent-authentication gate in execute(). */
  readonly authenticatedAt: Date;
}

export interface AddOfficeUserSuccess {
  readonly officeUserId: Uuid;
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * The minimal admin-facing counterpart to the dev bootstrap script
 * (apps/api/scripts/bootstrap-dev-office-user.ts) — same shape (find or
 * create a user_account, link an office_user), now a real use case an
 * authenticated admin can call instead of a script run by hand.
 *
 * Deliberately does NOT create a Keycloak account or set a credential.
 * 09-authentication-session-architecture.md, "Recovery and administration":
 * "Dentix administrators may link or disable an external identity but
 * never set or view passwords" — so this only ever links an identity that
 * already exists in the provider, found by email via KeycloakAdminPort.
 *
 * Authorization is a fresh lookup here, not a claim trusted from the
 * caller's session — CLAUDE.md invariant 7 ("endpoint AND object-level
 * checks on every mutation"). whoami's isOfficeAdmin field is a UI
 * convenience only; this is the actual gate.
 */
@Injectable()
export class AddOfficeUserUseCase {
  constructor(
    @Inject(OFFICE_USER_REPOSITORY) private readonly officeUsers: OfficeUserRepository,
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly userAccounts: UserAccountRepository,
    @Inject(KEYCLOAK_ADMIN_PORT) private readonly keycloakAdmin: KeycloakAdminPort,
    @Inject(AUDIT_EVENT_REPOSITORY) private readonly auditEvents: AuditEventRepository,
    @Inject(UNIT_OF_WORK_PORT) private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(
    command: AddOfficeUserCommand,
  ): Promise<Result<AddOfficeUserSuccess, AddOfficeUserErrorCode>> {
    const actor = await this.officeUsers.findByUserId(command.actorUserId);
    if (!actor || !actor.isActive || !actor.isOfficeAdmin) {
      return fail("FORBIDDEN");
    }

    // Granting someone access to the office — and therefore to patient data
    // — is permission administration, which 09-authentication-session-
    // architecture.md ("Recent authentication") lists alongside clinical
    // signing and refunds as requiring `authenticatedAt` inside the window.
    // Checked after the admin check on purpose: telling a non-admin to go
    // re-authenticate would invite a round trip that cannot help them.
    if (!isWithinRecentAuthenticationWindow(command.authenticatedAt, new Date())) {
      return fail("RECENT_AUTHENTICATION_REQUIRED");
    }

    const email = command.email.trim();
    if (!SIMPLE_EMAIL.test(email)) {
      return fail("INVALID_EMAIL");
    }

    const providerUser = await this.keycloakAdmin.findUserByEmail(email);
    if (!providerUser) {
      return fail("NOT_FOUND_IN_PROVIDER");
    }
    if (!providerUser.enabled) {
      return fail("PROVIDER_ACCOUNT_DISABLED");
    }

    const issuer = requireEnv("OIDC_ISSUER_URL");

    // Resolved before opening the transaction, on purpose: whether this
    // identity already has a user_account, and whether that account already
    // has an office_user row, are both things to know *before* deciding to
    // write anything. Keeping the transaction itself to unconditional writes
    // — same shape as CreatePatientUseCase — means there is no path where a
    // user_account gets created and then the surrounding call reports
    // ALREADY_LINKED, which would otherwise leave that question ambiguous:
    // returning a Result instead of throwing does not roll anything back.
    //
    // This check-then-write does leave a narrow race (two concurrent adds
    // for the same identity); the actual safety net for that is
    // office_user's own UQ_office_user_office_user DB constraint, which
    // turns a lost race into a thrown 500 rather than a duplicate
    // membership row. Acceptable for an admin-triggered, low-frequency
    // action; a friendlier ALREADY_LINKED on that specific race would mean
    // catching the constraint violation, not worth it for how rarely two
    // admins would add the exact same person within milliseconds of each
    // other.
    const existingAccount = await this.userAccounts.findByExternalIdentity(issuer, providerUser.subject);
    if (existingAccount) {
      const existingMembership = await this.officeUsers.findByUserId(existingAccount.id);
      if (existingMembership) {
        return fail("ALREADY_LINKED");
      }
    }

    const now = new Date();
    const success = await this.unitOfWork.runInTransaction(async (tx) => {
      const account =
        existingAccount ??
        UserAccount.create({
          id: asUuid(randomUUID()),
          externalSubject: providerUser.subject,
          issuer,
          displayName: providerUser.email,
        });
      if (!existingAccount) {
        await this.userAccounts.create(account, tx);
      }

      const officeUserId = asUuid(randomUUID());
      const officeUser = OfficeUser.create({
        id: officeUserId,
        officeId: command.officeId,
        userId: account.id,
      });
      await this.officeUsers.create(officeUser, command.actorUserId, tx);

      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: command.officeId,
          actorUserId: command.actorUserId,
          action: "office_user_added",
          entityType: "office_user",
          entityId: officeUserId,
          detail: null,
          now,
        }),
        tx,
      );

      return { officeUserId };
    });

    return ok(success);
  }
}
