import { Column, Entity, Index, PrimaryColumn, Unique, VersionColumn } from "typeorm";

@Entity({ name: "office_user" })
@Unique("UQ_office_user_office_user", ["officeId", "userId"])
export class OfficeUserOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "office_id", type: "uuid" })
  officeId!: string;

  @Index("IX_office_user_user_id")
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "permission_version", type: "integer", default: 1 })
  permissionVersion!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "is_office_admin", type: "boolean", default: false })
  isOfficeAdmin!: boolean;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy!: string | null;

  @VersionColumn()
  version!: number;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @Column({ name: "archived_by", type: "uuid", nullable: true })
  archivedBy!: string | null;
}
