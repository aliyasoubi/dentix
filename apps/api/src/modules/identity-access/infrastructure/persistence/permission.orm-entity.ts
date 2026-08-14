import { Column, Entity, PrimaryColumn, Unique } from "typeorm";

/**
 * Application-owned, globally unique, seeded once by migration
 * 1786735766477 — never written by application code. No repository
 * `create()`/`update()` exists for this entity on purpose; it is read-only
 * from the application's point of view.
 */
@Entity({ name: "permission" })
@Unique("UQ_permission_code", ["code"])
export class PermissionOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  code!: string;
}
