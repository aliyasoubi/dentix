import { asUuid } from "@dentix/kernel";
import { UserSession } from "../../domain/entities/user-session.entity";
import { UserSessionOrmEntity } from "../persistence/user-session.orm-entity";

export class UserSessionMapper {
  static toDomain(record: UserSessionOrmEntity): UserSession {
    return UserSession.reconstitute({
      id: asUuid(record.id),
      sessionHash: record.sessionHash,
      userId: asUuid(record.userId),
      officeId: asUuid(record.officeId),
      authenticatedAt: record.authenticatedAt,
      mfaContext: record.mfaContext,
      csrfTokenHash: record.csrfTokenHash,
      permissionVersion: record.permissionVersion,
      createdAt: record.createdAt,
      lastSeenAt: record.lastSeenAt,
      idleExpiresAt: record.idleExpiresAt,
      absoluteExpiresAt: record.absoluteExpiresAt,
      revokedAt: record.revokedAt,
      revokedReason: record.revokedReason,
    });
  }

  /**
   * Insert-only: touch()/revoke() persist through their own narrow,
   * conditional repository methods (touchIfActive/revoke) rather than a
   * full-row toOrm() round-trip, so a stale in-memory copy can never
   * blind-overwrite a concurrent mutation.
   */
  static toOrm(session: UserSession): UserSessionOrmEntity {
    const record = new UserSessionOrmEntity();
    record.id = session.id;
    record.sessionHash = session.sessionHash;
    record.userId = session.userId;
    record.officeId = session.officeId;
    record.authenticatedAt = session.authenticatedAt;
    record.mfaContext = session.mfaContext;
    record.csrfTokenHash = session.csrfTokenHash;
    record.permissionVersion = session.permissionVersion;
    record.createdAt = session.createdAt;
    record.lastSeenAt = session.lastSeenAt;
    record.idleExpiresAt = session.idleExpiresAt;
    record.absoluteExpiresAt = session.absoluteExpiresAt;
    record.revokedAt = session.revokedAt;
    record.revokedReason = session.revokedReason;
    return record;
  }
}
