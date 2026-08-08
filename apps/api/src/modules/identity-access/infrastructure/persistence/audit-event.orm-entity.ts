import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Append-only: no @VersionColumn, no updated_at/updated_by, no archive
 * columns — those are for mutable business entities. An audit row is
 * written once and never touched again (04-data-model.md: "Audit rows are
 * append-only to application roles").
 */
@Entity({ name: "audit_event" })
export class AuditEventOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_audit_event_office_id")
  @Column({ name: "office_id", type: "uuid", nullable: true })
  officeId!: string | null;

  @Index("IX_audit_event_actor_user_id")
  @Column({ name: "actor_user_id", type: "uuid", nullable: true })
  actorUserId!: string | null;

  @Column({ type: "varchar" })
  action!: string;

  @Column({ name: "entity_type", type: "varchar" })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid", nullable: true })
  entityId!: string | null;

  @Column({ type: "text", nullable: true })
  detail!: string | null;

  @Index("IX_audit_event_occurred_at")
  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;
}
