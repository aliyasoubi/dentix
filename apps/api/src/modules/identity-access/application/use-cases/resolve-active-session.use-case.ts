import { Inject, Injectable } from "@nestjs/common";
import { fail, ok, Result } from "@dentix/kernel";
import { UserSession } from "../../domain/entities/user-session.entity";
import { USER_SESSION_REPOSITORY } from "../../domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { SESSION_TOKEN_PORT } from "../ports/session-token.port";
import type { SessionTokenPort } from "../ports/session-token.port";

export type ResolveSessionErrorCode = "NO_SESSION" | "REVOKED" | "IDLE_EXPIRED" | "ABSOLUTE_EXPIRED";

/**
 * Shared by SessionGuard (every protected request) and GetSessionUseCase
 * (whoami's own response) so "resolve by cookie, validate, touch" exists
 * in exactly one place. Touching on every guarded request — not just
 * whoami — is deliberate: activity is what the idle-timeout policy is
 * supposed to measure.
 */
@Injectable()
export class ResolveActiveSessionUseCase {
  constructor(
    @Inject(USER_SESSION_REPOSITORY) private readonly sessions: UserSessionRepository,
    @Inject(SESSION_TOKEN_PORT) private readonly sessionTokens: SessionTokenPort,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
  }): Promise<Result<UserSession, ResolveSessionErrorCode>> {
    const session = await this.sessions.findByHash(this.sessionTokens.hash(params.sessionToken));
    if (!session) {
      return fail("NO_SESSION");
    }

    const now = new Date();
    const validity = session.checkValidity(now);
    if (!validity.valid) {
      return fail(validity.reason);
    }

    session.touch(now);
    await this.sessions.update(session);

    return ok(session);
  }
}
