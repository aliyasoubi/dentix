import { asUuid } from "@dentix/kernel";
import { PatientIdentifier, PatientIdentifierType } from "../../domain/entities/patient-identifier.entity";
import { PatientIdentifierOrmEntity } from "../persistence/patient-identifier.orm-entity";

export class PatientIdentifierMapper {
  static toDomain(record: PatientIdentifierOrmEntity): PatientIdentifier {
    return PatientIdentifier.reconstitute({
      id: asUuid(record.id),
      patientId: asUuid(record.patientId),
      identifierType: record.identifierType as PatientIdentifierType,
      originalValue: record.originalValue,
      normalizedValue: record.normalizedValue,
      createdAt: record.createdAt,
      createdBy: asUuid(record.createdBy),
    });
  }

  static toOrm(identifier: PatientIdentifier): PatientIdentifierOrmEntity {
    const record = new PatientIdentifierOrmEntity();
    record.id = identifier.id;
    record.patientId = identifier.patientId;
    record.identifierType = identifier.identifierType;
    record.originalValue = identifier.originalValue;
    record.normalizedValue = identifier.normalizedValue;
    record.createdAt = identifier.createdAt;
    record.createdBy = identifier.createdBy;
    return record;
  }
}
