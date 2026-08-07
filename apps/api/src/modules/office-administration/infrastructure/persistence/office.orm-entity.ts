import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * ORM shape only. Never imported outside infrastructure/ — domain/ and
 * application/ see Office (the domain entity) via OfficeMapper instead
 * (03-module-boundaries.md: "ORM entities never cross into domain/ or API
 * responses").
 */
@Entity({ name: "office" })
export class OfficeOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  code!: string;

  @Column({ type: "varchar" })
  timezone!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  // Nullable, no FK yet: user_account doesn't exist until S3 (identity-access).
  // A later migration adds the FK once that table exists.
  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy!: string | null;

  @Column({ type: "integer", default: 1 })
  version!: number;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @Column({ name: "archived_by", type: "uuid", nullable: true })
  archivedBy!: string | null;
}
