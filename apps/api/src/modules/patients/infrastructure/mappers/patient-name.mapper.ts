import { asUuid } from "@dentix/kernel";
import { PatientName, PatientNameType } from "../../domain/entities/patient-name.entity";
import { PatientNameOrmEntity } from "../persistence/patient-name.orm-entity";

export class PatientNameMapper {
  static toDomain(record: PatientNameOrmEntity): PatientName {
    return PatientName.reconstitute({
      id: asUuid(record.id),
      patientId: asUuid(record.patientId),
      nameType: record.nameType as PatientNameType,
      originalValue: record.originalValue,
      normalizedValue: record.normalizedValue,
      isCurrent: record.isCurrent,
      createdAt: record.createdAt,
      createdBy: asUuid(record.createdBy),
    });
  }

  static toOrm(name: PatientName): PatientNameOrmEntity {
    const record = new PatientNameOrmEntity();
    record.id = name.id;
    record.patientId = name.patientId;
    record.nameType = name.nameType;
    record.originalValue = name.originalValue;
    record.normalizedValue = name.normalizedValue;
    record.isCurrent = name.isCurrent;
    record.createdAt = name.createdAt;
    record.createdBy = name.createdBy;
    return record;
  }
}
