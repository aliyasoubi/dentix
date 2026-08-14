import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";

@Entity({ name: "user_role" })
@Unique("UQ_user_role_office_user_role", ["officeUserId", "roleId"])
export class UserRoleOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_user_role_office_user_id")
  @Column({ name: "office_user_id", type: "uuid" })
  officeUserId!: string;

  @Column({ name: "role_id", type: "uuid" })
  roleId!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;
}
