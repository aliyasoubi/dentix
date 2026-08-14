import { Column, Entity, PrimaryColumn, Unique, VersionColumn } from "typeorm";

@Entity({ name: "role" })
@Unique("UQ_role_office_code", ["officeId", "code"])
export class RoleOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "office_id", type: "uuid" })
  officeId!: string;

  @Column({ type: "varchar" })
  code!: string;

  @Column({ type: "varchar" })
  name!: string;

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
