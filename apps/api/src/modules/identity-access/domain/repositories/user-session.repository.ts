import { TransactionContext } from "@dentix/kernel";
import { UserSession } from "../entities/user-session.entity";

export interface UserSessionRepository {
  findByHash(sessionHash: string): Promise<UserSession | null>;
  create(session: UserSession, tx?: TransactionContext): Promise<void>;
  /**
   * Persists touch()'s new lastSeenAt/idleExpiresAt, but only if the row is
   * still unrevoked at write time (checked in the same statement, not
   * against the copy read earlier) — otherwise a touch racing a concurrent
   * revoke could win the write and resurrect a session logout just
   * revoked. Returns false when the row was already revoked, in which
   * case the touch was correctly discarded.
   */
  touchIfActive(session: UserSession): Promise<boolean>;
  /**
   * Persists revoke()'s revokedAt/revokedReason. Scoped to "still
   * unrevoked" so two concurrent revokes (e.g. logout racing an
   * account-deactivation sweep) can't overwrite which reason won; the
   * first to commit sticks.
   */
  revoke(session: UserSession, tx?: TransactionContext): Promise<void>;
}

export const USER_SESSION_REPOSITORY = Symbol("USER_SESSION_REPOSITORY");
