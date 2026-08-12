import { asUuid } from "@dentix/kernel";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { OutboxEventOrmEntity } from "../persistence/outbox-event.orm-entity";

export class OutboxEventMapper {
  static toDomain(record: OutboxEventOrmEntity): OutboxEvent {
    return OutboxEvent.reconstitute({
      id: asUuid(record.id),
      eventType: record.eventType,
      eventVersion: record.eventVersion,
      occurredAt: record.occurredAt,
      officeId: asUuid(record.officeId),
      aggregateType: record.aggregateType,
      aggregateId: asUuid(record.aggregateId),
      aggregateVersion: record.aggregateVersion,
      actorId: record.actorId ? asUuid(record.actorId) : null,
      correlationId: asUuid(record.correlationId),
      causationId: record.causationId ? asUuid(record.causationId) : null,
      payload: record.payload,
      createdAt: record.createdAt,
      availableAt: record.availableAt,
      publishedAt: record.publishedAt,
      attempts: record.attempts,
      lastError: record.lastError,
    });
  }

  static toOrm(event: OutboxEvent): OutboxEventOrmEntity {
    const record = new OutboxEventOrmEntity();
    record.id = event.id;
    record.eventType = event.eventType;
    record.eventVersion = event.eventVersion;
    record.occurredAt = event.occurredAt;
    record.officeId = event.officeId;
    record.aggregateType = event.aggregateType;
    record.aggregateId = event.aggregateId;
    record.aggregateVersion = event.aggregateVersion;
    record.actorId = event.actorId;
    record.correlationId = event.correlationId;
    record.causationId = event.causationId;
    record.payload = event.payload;
    record.createdAt = event.createdAt;
    record.availableAt = event.availableAt;
    record.publishedAt = event.publishedAt;
    record.attempts = event.attempts;
    record.lastError = event.lastError;
    return record;
  }
}
