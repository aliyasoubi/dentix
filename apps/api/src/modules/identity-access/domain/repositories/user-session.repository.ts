import { UserSession } from "../entities/user-session.entity";

export interface UserSessionRepository {
  findByHash(sessionHash: string): Promise<UserSession | null>;
  create(session: UserSession): Promise<void>;
  /** Persists mutations from touch()/revoke() on an already-loaded session. */
  update(session: UserSession): Promise<void>;
}

export const USER_SESSION_REPOSITORY = Symbol("USER_SESSION_REPOSITORY");
