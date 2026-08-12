import { Uuid } from "@dentix/kernel";

/**
 * 08-transaction-event-semantics.md's event envelope, minus nothing — this
 * table is the one place every future module's producer appends to, so
 * unlike audit_event's "minimal slice for what exists today" precedent,
 * the envelope is built to the documented full shape now (00-build-
 * sequencing.md: "Keep the outbox schema now... the schema is cheap").
 */
export interface OutboxEventProps {
  readonly id: Uuid;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: Date;
  readonly officeId: Uuid;
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
  readonly aggregateVersion: number;
  readonly actorId: Uuid | null;
  readonly correlationId: Uuid;
  readonly causationId: Uuid | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly availableAt: Date;
  readonly publishedAt: Date | null;
  readonly attempts: number;
  readonly lastError: string | null;
}

/**
 * No consumer platform is built around this yet (00-build-sequencing.md:
 * "do not build a generic event-consumption platform before actual
 * consumers exist" — that's R2's BullMQ work). What's proven here is the
 * append + claim shape: a row is created pending, a publisher claims it
 * via `FOR UPDATE SKIP LOCKED` (the repository port), and marks it
 * published — this entity models exactly that lifecycle, nothing past it.
 */
export class OutboxEvent {
  private constructor(private readonly props: OutboxEventProps) {}

  static reconstitute(props: OutboxEventProps): OutboxEvent {
    return new OutboxEvent(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly eventType: string;
    readonly eventVersion: number;
    readonly officeId: Uuid;
    readonly aggregateType: string;
    readonly aggregateId: Uuid;
    readonly aggregateVersion: number;
    readonly actorId: Uuid | null;
    readonly correlationId: Uuid;
    readonly causationId: Uuid | null;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly now: Date;
  }): OutboxEvent {
    return new OutboxEvent({
      ...params,
      occurredAt: params.now,
      createdAt: params.now,
      availableAt: params.now,
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });
  }

  /** New value, not a mutator — the ORM repository decides what actually gets persisted (04-data-model.md immutability rules apply to domain records, not this lifecycle bookkeeping). */
  markPublished(publishedAt: Date): OutboxEvent {
    return new OutboxEvent({ ...this.props, publishedAt });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get eventVersion(): number {
    return this.props.eventVersion;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get officeId(): Uuid {
    return this.props.officeId;
  }

  get aggregateType(): string {
    return this.props.aggregateType;
  }

  get aggregateId(): Uuid {
    return this.props.aggregateId;
  }

  get aggregateVersion(): number {
    return this.props.aggregateVersion;
  }

  get actorId(): Uuid | null {
    return this.props.actorId;
  }

  get correlationId(): Uuid {
    return this.props.correlationId;
  }

  get causationId(): Uuid | null {
    return this.props.causationId;
  }

  get payload(): Readonly<Record<string, unknown>> {
    return this.props.payload;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get availableAt(): Date {
    return this.props.availableAt;
  }

  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get lastError(): string | null {
    return this.props.lastError;
  }
}
