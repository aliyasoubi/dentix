import { asUuid } from "@dentix/kernel";
import { PatientContact, PatientContactType } from "../../domain/entities/patient-contact.entity";
import { PatientContactOrmEntity } from "../persistence/patient-contact.orm-entity";

export class PatientContactMapper {
  static toDomain(record: PatientContactOrmEntity): PatientContact {
    return PatientContact.reconstitute({
      id: asUuid(record.id),
      patientId: asUuid(record.patientId),
      contactType: record.contactType as PatientContactType,
      originalValue: record.originalValue,
      normalizedValue: record.normalizedValue,
      isPreferred: record.isPreferred,
      createdAt: record.createdAt,
      createdBy: asUuid(record.createdBy),
    });
  }

  static toOrm(contact: PatientContact): PatientContactOrmEntity {
    const record = new PatientContactOrmEntity();
    record.id = contact.id;
    record.patientId = contact.patientId;
    record.contactType = contact.contactType;
    record.originalValue = contact.originalValue;
    record.normalizedValue = contact.normalizedValue;
    record.isPreferred = contact.isPreferred;
    record.createdAt = contact.createdAt;
    record.createdBy = contact.createdBy;
    return record;
  }
}
