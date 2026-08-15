import { Inject, Injectable } from "@nestjs/common";
import { Uuid, fail, ok, Result } from "@dentix/kernel";
import { USER_ACCOUNT_REPOSITORY } from "../../domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import { AUTHORIZATION_PORT } from "../ports/authorization.port";
import type { AuthorizationPort } from "../ports/authorization.port";
import { ResolveActiveSessionUseCase } from "./resolve-active-session.use-case";
import type { ResolveSessionErrorCode } from "./resolve-active-session.use-case";

export type GetSessionErrorCode = ResolveSessionErrorCode;

export interface CurrentSession {
  readonly userId: Uuid;
  readonly officeId: Uuid;
  readonly displayName: string;
  readonly permissionVersion: number;
  readonly authenticatedAt: Date;
  readonly isRecentlyAuthenticated: boolean;
  /**
   * A UI convenience only — whether to show the "add user" entry point.
   * The real gate is AddOfficeUserUseCase's own fresh lookup at the moment
   * of the request; this field must never be treated as authorization by
   * anything that reads it.
   */
  readonly canManageUsers: boolean;
}

/** Backs GET /auth/whoami. */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly resolveActiveSession: ResolveActiveSessionUseCase,
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly userAccounts: UserAccountRepository,
    @Inject(AUTHORIZATION_PORT) private readonly authorization: AuthorizationPort,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
  }): Promise<Result<CurrentSession, GetSessionErrorCode>> {
    const result = await this.resolveActiveSession.execute(params);
    if (!result.ok) {
      return fail(result.code);
    }
    const session = result.value;

    const [account, canManageUsers] = await Promise.all([
      this.userAccounts.findById(session.userId),
      this.authorization.hasPermission(session.userId, session.officeId, "user.manage"),
    ]);

    return ok({
      userId: session.userId,
      officeId: session.officeId,
      displayName: account?.displayName ?? "",
      permissionVersion: session.permissionVersion,
      authenticatedAt: session.authenticatedAt,
      isRecentlyAuthenticated: session.isRecentlyAuthenticated(new Date()),
      canManageUsers,
    });
  }
}
