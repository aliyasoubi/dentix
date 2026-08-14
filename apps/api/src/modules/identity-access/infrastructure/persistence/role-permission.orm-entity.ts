import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";

/** Which permissions a role grants. Seeded per role at role-creation time (S1 slice 3); no "edit role grants" use case exists yet. */
@Entity({ name: "role_permission" })
@Unique("UQ_role_permission_role_permission", ["roleId", "permissionId"])
export class RolePermissionOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_role_permission_role_id")
  @Column({ name: "role_id", type: "uuid" })
  roleId!: string;

  @Column({ name: "permission_id", type: "uuid" })
  permissionId!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
