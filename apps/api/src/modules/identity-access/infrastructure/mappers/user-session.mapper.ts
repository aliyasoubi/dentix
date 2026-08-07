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
   * Used for both insert (create) and update (touch/revoke). Safe to
   * share, unlike Office/UserAccount's insert-only mapper: every field
   * here — including createdAt — is read from the domain entity's own
   * state rather than fabricated, and UserSession never exposes a way to
   * mutate createdAt after construction, so re-writing it on update is a
   * correct no-op, not the created_at-overwrite bug that method guards
   * against.
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
