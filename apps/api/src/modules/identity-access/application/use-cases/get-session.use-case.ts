import { Inject, Injectable } from "@nestjs/common";
import { Uuid, fail, ok, Result } from "@dentix/kernel";
import { OFFICE_USER_REPOSITORY } from "../../domain/repositories/office-user.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { USER_ACCOUNT_REPOSITORY } from "../../domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
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
  readonly isOfficeAdmin: boolean;
}

/** Backs GET /auth/whoami. */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly resolveActiveSession: ResolveActiveSessionUseCase,
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly userAccounts: UserAccountRepository,
    @Inject(OFFICE_USER_REPOSITORY) private readonly officeUsers: OfficeUserRepository,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
  }): Promise<Result<CurrentSession, GetSessionErrorCode>> {
    const result = await this.resolveActiveSession.execute(params);
    if (!result.ok) {
      return fail(result.code);
    }
    const session = result.value;

    const [account, officeUser] = await Promise.all([
      this.userAccounts.findById(session.userId),
      this.officeUsers.findByUserId(session.userId),
    ]);

    return ok({
      userId: session.userId,
      officeId: session.officeId,
      displayName: account?.displayName ?? "",
      permissionVersion: session.permissionVersion,
      authenticatedAt: session.authenticatedAt,
      isRecentlyAuthenticated: session.isRecentlyAuthenticated(new Date()),
      isOfficeAdmin: officeUser?.isOfficeAdmin ?? false,
    });
  }
}
