import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * 04-data-model.md: "event envelope, payload, created/available/published
 * times, attempts, last error; unique event_id" — `id` here is that
 * event_id (the row's own PK), matching audit_event's single-uuid-PK
 * shape. Unlike audit_event this is NOT append-only: `published_at`/
 * `attempts`/`last_error` are updated in place as a publisher processes
 * the row (the lifecycle OutboxEvent.markPublished models).
 */
@Entity({ name: "outbox_event" })
export class OutboxEventOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "event_type", type: "varchar" })
  eventType!: string;

  @Column({ name: "event_version", type: "integer" })
  eventVersion!: number;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Index("IX_outbox_event_office_id")
  @Column({ name: "office_id", type: "uuid" })
  officeId!: string;

  @Column({ name: "aggregate_type", type: "varchar" })
  aggregateType!: string;

  @Column({ name: "aggregate_id", type: "uuid" })
  aggregateId!: string;

  @Column({ name: "aggregate_version", type: "integer" })
  aggregateVersion!: number;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ name: "correlation_id", type: "uuid" })
  correlationId!: string;

  @Column({ name: "causation_id", type: "uuid", nullable: true })
  causationId!: string | null;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "available_at", type: "timestamptz" })
  availableAt!: Date;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt!: Date | null;

  @Column({ type: "integer" })
  attempts!: number;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError!: string | null;
}
