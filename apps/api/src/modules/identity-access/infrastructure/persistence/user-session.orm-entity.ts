import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";

@Entity({ name: "user_session" })
@Unique("UQ_user_session_session_hash", ["sessionHash"])
export class UserSessionOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "session_hash", type: "varchar" })
  sessionHash!: string;

  @Index("IX_user_session_user_id")
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "office_id", type: "uuid" })
  officeId!: string;

  @Column({ name: "authenticated_at", type: "timestamptz" })
  authenticatedAt!: Date;

  @Column({ name: "mfa_context", type: "varchar", nullable: true })
  mfaContext!: string | null;

  @Column({ name: "csrf_token_hash", type: "varchar" })
  csrfTokenHash!: string;

  @Column({ name: "permission_version", type: "integer" })
  permissionVersion!: number;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;

  @Column({ name: "idle_expires_at", type: "timestamptz" })
  idleExpiresAt!: Date;

  @Column({ name: "absolute_expires_at", type: "timestamptz" })
  absoluteExpiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "revoked_reason", type: "varchar", nullable: true })
  revokedReason!: string | null;
}
