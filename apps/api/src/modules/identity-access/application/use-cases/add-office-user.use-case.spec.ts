import { randomUUID } from "crypto";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import { AddOfficeUserCommand, AddOfficeUserUseCase } from "./add-office-user.use-case";
import { AuditEvent } from "../../../audit/domain/entities/audit-event.entity";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { UserAccount } from "../../domain/entities/user-account.entity";
import type { KeycloakAdminUser } from "../ports/keycloak-admin.port";
import type { UnitOfWorkPort } from "../../../../platform/unit-of-work.port";

describe("AddOfficeUserUseCase", () => {
  const officeId = asUuid(randomUUID());
  const actorUserId = asUuid(randomUUID());
  const issuer = "https://kc.local/realms/test";
  const originalEnv = process.env["OIDC_ISSUER_URL"];

  beforeEach(() => {
    process.env["OIDC_ISSUER_URL"] = issuer;
  });

  afterEach(() => {
    process.env["OIDC_ISSUER_URL"] = originalEnv;
  });

  /**
   * Defaults `authenticatedAt` to now, so every test that isn't about the
   * recent-authentication gate passes it trivially; the gate's own tests
   * below pass an explicitly stale value instead.
   */
  function command(email: string, authenticatedAt: Date = new Date()): AddOfficeUserCommand {
    return { officeId, actorUserId, email, authenticatedAt };
  }

  function buildAdminActor(
    overrides: Partial<{ isActive: boolean; isOfficeAdmin: boolean }> = {},
  ): OfficeUser {
    return OfficeUser.reconstitute({
      id: asUuid(randomUUID()),
      officeId,
      userId: actorUserId,
      permissionVersion: 1,
      isActive: overrides.isActive ?? true,
      isOfficeAdmin: overrides.isOfficeAdmin ?? true,
    });
  }

  function buildUseCase(options: {
    actor?: OfficeUser | null;
    providerUser?: KeycloakAdminUser | null;
    existingAccount?: UserAccount | null;
    existingMembership?: OfficeUser | null;
  }): {
    useCase: AddOfficeUserUseCase;
    officeUsers: {
      findByUserId: jest.Mock<Promise<OfficeUser | null>, [Uuid]>;
      create: jest.Mock<Promise<void>, [OfficeUser, Uuid | null, TransactionContext?]>;
    };
    userAccounts: {
      findByExternalIdentity: jest.Mock<Promise<UserAccount | null>, [string, string]>;
      findById: jest.Mock<Promise<UserAccount | null>, [Uuid]>;
      create: jest.Mock<Promise<void>, [UserAccount, TransactionContext?]>;
    };
    keycloakAdmin: { findUserByEmail: jest.Mock<Promise<KeycloakAdminUser | null>, [string]> };
    auditEvents: { create: jest.Mock<Promise<void>, [AuditEvent, TransactionContext?]> };
  } {
    const actor = options.actor === undefined ? buildAdminActor() : options.actor;

    const officeUsers = {
      findByUserId: jest.fn<Promise<OfficeUser | null>, [Uuid]>().mockImplementation((userId) => {
        if (userId === actorUserId) return Promise.resolve(actor);
        return Promise.resolve(options.existingMembership ?? null);
      }),
      create: jest.fn<Promise<void>, [OfficeUser, Uuid | null, TransactionContext?]>(),
    };
    const userAccounts = {
      findByExternalIdentity: jest
        .fn<Promise<UserAccount | null>, [string, string]>()
        .mockResolvedValue(options.existingAccount ?? null),
      findById: jest.fn<Promise<UserAccount | null>, [Uuid]>(),
      create: jest.fn<Promise<void>, [UserAccount, TransactionContext?]>(),
    };
    const keycloakAdmin = {
      findUserByEmail: jest
        .fn<Promise<KeycloakAdminUser | null>, [string]>()
        .mockResolvedValue(
          options.providerUser === undefined
            ? { subject: "kc-sub-new", email: "new.person@example.com", enabled: true }
            : options.providerUser,
        ),
    };
    const auditEvents = { create: jest.fn<Promise<void>, [AuditEvent, TransactionContext?]>() };
    const unitOfWork: UnitOfWorkPort = {
      runInTransaction: jest.fn(async (work) => work({ _brand: "TransactionContext" } as never)),
    };

    const useCase = new AddOfficeUserUseCase(
      officeUsers,
      userAccounts,
      keycloakAdmin,
      auditEvents,
      unitOfWork,
    );

    return { useCase, officeUsers, userAccounts, keycloakAdmin, auditEvents };
  }

  it("rejects a non-admin actor without ever calling the provider", async () => {
    const { useCase, keycloakAdmin } = buildUseCase({ actor: buildAdminActor({ isOfficeAdmin: false }) });

    const result = await useCase.execute(command("new.person@example.com"));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("FORBIDDEN");
    expect(keycloakAdmin.findUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects an actor with no office_user row at all (e.g. a stale/forged actorUserId)", async () => {
    const { useCase } = buildUseCase({ actor: null });
    const result = await useCase.execute(command("new.person@example.com"));
    expect(!result.ok && result.code).toBe("FORBIDDEN");
  });

  it("rejects a deactivated admin — isOfficeAdmin alone is not enough", async () => {
    const { useCase } = buildUseCase({ actor: buildAdminActor({ isActive: false, isOfficeAdmin: true }) });
    const result = await useCase.execute(command("new.person@example.com"));
    expect(!result.ok && result.code).toBe("FORBIDDEN");
  });

  // Permission administration is on 09-authentication-session-architecture.md's
  // recent-authentication list, alongside clinical signing and refunds.
  describe("recent-authentication gate", () => {
    const STALE = new Date(Date.now() - 6 * 60 * 1000);

    it("rejects an admin whose session authenticated outside the window", async () => {
      const { useCase, keycloakAdmin } = buildUseCase({});

      const result = await useCase.execute(command("new.person@example.com", STALE));

      expect(!result.ok && result.code).toBe("RECENT_AUTHENTICATION_REQUIRED");
      // Nothing about the target identity should leak to a caller who has
      // not re-authenticated yet — not even whether that email exists.
      expect(keycloakAdmin.findUserByEmail).not.toHaveBeenCalled();
    });

    it("writes nothing when the gate rejects", async () => {
      const { useCase, officeUsers, userAccounts, auditEvents } = buildUseCase({});

      await useCase.execute(command("new.person@example.com", STALE));

      expect(userAccounts.create).not.toHaveBeenCalled();
      expect(officeUsers.create).not.toHaveBeenCalled();
      expect(auditEvents.create).not.toHaveBeenCalled();
    });

    // Order matters: a non-admin must not be told to go re-authenticate,
    // since doing so would not get them past the admin check anyway.
    it("reports FORBIDDEN, not RECENT_AUTHENTICATION_REQUIRED, for a stale non-admin", async () => {
      const { useCase } = buildUseCase({ actor: buildAdminActor({ isOfficeAdmin: false }) });

      const result = await useCase.execute(command("new.person@example.com", STALE));

      expect(!result.ok && result.code).toBe("FORBIDDEN");
    });

    it("allows an admin authenticated just inside the window", async () => {
      const { useCase } = buildUseCase({});
      const justInside = new Date(Date.now() - 4 * 60 * 1000);

      const result = await useCase.execute(command("new.person@example.com", justInside));

      expect(result.ok).toBe(true);
    });
  });

  it("rejects a malformed email before ever calling the provider", async () => {
    const { useCase, keycloakAdmin } = buildUseCase({});
    const result = await useCase.execute(command("not-an-email"));
    expect(!result.ok && result.code).toBe("INVALID_EMAIL");
    expect(keycloakAdmin.findUserByEmail).not.toHaveBeenCalled();
  });

  it("reports NOT_FOUND_IN_PROVIDER when no Keycloak account has that email — never creates one", async () => {
    const { useCase, userAccounts } = buildUseCase({ providerUser: null });
    const result = await useCase.execute(command("nobody@example.com"));
    expect(!result.ok && result.code).toBe("NOT_FOUND_IN_PROVIDER");
    expect(userAccounts.create).not.toHaveBeenCalled();
  });

  it("refuses to link a disabled Keycloak account", async () => {
    const { useCase, userAccounts } = buildUseCase({
      providerUser: { subject: "kc-sub-disabled", email: "disabled@example.com", enabled: false },
    });
    const result = await useCase.execute(command("disabled@example.com"));
    expect(!result.ok && result.code).toBe("PROVIDER_ACCOUNT_DISABLED");
    expect(userAccounts.create).not.toHaveBeenCalled();
  });

  it("rejects an identity that is already an office_user here, without creating a duplicate", async () => {
    const existingAccount = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: "kc-sub-existing",
      issuer,
      displayName: "Existing Person",
    });
    const existingMembership = OfficeUser.reconstitute({
      id: asUuid(randomUUID()),
      officeId,
      userId: existingAccount.id,
      permissionVersion: 1,
      isActive: true,
      isOfficeAdmin: false,
    });
    const { useCase, officeUsers, userAccounts } = buildUseCase({
      providerUser: { subject: "kc-sub-existing", email: "existing@example.com", enabled: true },
      existingAccount,
      existingMembership,
    });

    const result = await useCase.execute(command("existing@example.com"));

    expect(!result.ok && result.code).toBe("ALREADY_LINKED");
    expect(officeUsers.create).not.toHaveBeenCalled();
    expect(userAccounts.create).not.toHaveBeenCalled();
  });

  it("creates a new user_account and links it, non-admin by default, with an audit event", async () => {
    const { useCase, officeUsers, userAccounts, auditEvents } = buildUseCase({});

    const result = await useCase.execute(command("new.person@example.com"));

    expect(result.ok).toBe(true);
    expect(userAccounts.create).toHaveBeenCalledTimes(1);
    const createdAccount = userAccounts.create.mock.calls[0][0];
    expect(createdAccount.externalSubject).toBe("kc-sub-new");
    expect(createdAccount.issuer).toBe(issuer);

    expect(officeUsers.create).toHaveBeenCalledTimes(1);
    const createdMembership = officeUsers.create.mock.calls[0][0];
    const createdBy = officeUsers.create.mock.calls[0][1];
    // The whole point of OfficeUser.create() not taking an admin flag: it
    // can't be granted through this path even if the request tried to.
    expect(createdMembership.isOfficeAdmin).toBe(false);
    expect(createdBy).toBe(actorUserId);

    expect(auditEvents.create).toHaveBeenCalledTimes(1);
    const auditEvent = auditEvents.create.mock.calls[0][0];
    expect(auditEvent.action).toBe("office_user_added");
    expect(auditEvent.actorUserId).toBe(actorUserId);
  });

  it("reuses an existing user_account for the identity rather than creating a second one", async () => {
    const existingAccount = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: "kc-sub-reuse",
      issuer,
      displayName: "Reused Person",
    });
    const { useCase, officeUsers, userAccounts } = buildUseCase({
      providerUser: { subject: "kc-sub-reuse", email: "reuse@example.com", enabled: true },
      existingAccount,
      existingMembership: null,
    });

    const result = await useCase.execute(command("reuse@example.com"));

    expect(result.ok).toBe(true);
    expect(userAccounts.create).not.toHaveBeenCalled();
    expect(officeUsers.create).toHaveBeenCalledTimes(1);
    const createdMembership = officeUsers.create.mock.calls[0][0];
    expect(createdMembership.userId).toBe(existingAccount.id);
  });
});
