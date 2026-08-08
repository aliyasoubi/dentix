import { asUuid } from "@dentix/kernel";
import { AuditAction, AuditEvent } from "../../domain/entities/audit-event.entity";
import { AuditEventOrmEntity } from "../persistence/audit-event.orm-entity";

export class AuditEventMapper {
  static toDomain(record: AuditEventOrmEntity): AuditEvent {
    return AuditEvent.reconstitute({
      id: asUuid(record.id),
      officeId: record.officeId ? asUuid(record.officeId) : null,
      actorUserId: record.actorUserId ? asUuid(record.actorUserId) : null,
      action: record.action as AuditAction,
      entityType: record.entityType,
      entityId: record.entityId ? asUuid(record.entityId) : null,
      detail: record.detail,
      occurredAt: record.occurredAt,
    });
  }

  static toOrm(event: AuditEvent): AuditEventOrmEntity {
    const record = new AuditEventOrmEntity();
    record.id = event.id;
    record.officeId = event.officeId;
    record.actorUserId = event.actorUserId;
    record.action = event.action;
    record.entityType = event.entityType;
    record.entityId = event.entityId;
    record.detail = event.detail;
    record.occurredAt = event.occurredAt;
    return record;
  }
}
