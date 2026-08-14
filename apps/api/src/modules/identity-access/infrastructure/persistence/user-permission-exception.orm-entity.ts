import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "user_permission_exception" })
export class UserPermissionExceptionOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_user_permission_exception_office_user_id")
  @Column({ name: "office_user_id", type: "uuid" })
  officeUserId!: string;

  @Column({ name: "permission_id", type: "uuid" })
  permissionId!: string;

  @Column({ type: "varchar" })
  effect!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ name: "effective_at", type: "timestamptz" })
  effectiveAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "revoked_by", type: "uuid", nullable: true })
  revokedBy!: string | null;
}
