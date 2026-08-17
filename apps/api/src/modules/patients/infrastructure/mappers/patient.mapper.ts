import { asUuid } from "@dentix/kernel";
import { Patient, PatientNationality, PatientSex, PatientStatus } from "../../domain/entities/patient.entity";
import { PatientOrmEntity } from "../persistence/patient.orm-entity";

export class PatientMapper {
  static toDomain(record: PatientOrmEntity): Patient {
    return Patient.reconstitute({
      id: asUuid(record.id),
      officeId: asUuid(record.officeId),
      patientNumber: record.patientNumber,
      status: record.status as PatientStatus,
      dateOfBirth: record.dateOfBirth ? new Date(`${record.dateOfBirth}T00:00:00.000Z`) : null,
      sex: record.sex as PatientSex,
      nationality: record.nationality as PatientNationality,
      contactUnavailable: record.contactUnavailable,
      createdAt: record.createdAt,
      createdBy: asUuid(record.createdBy),
      updatedAt: record.updatedAt,
      updatedBy: asUuid(record.updatedBy),
      version: record.version,
      archivedAt: record.archivedAt,
      archivedBy: record.archivedBy ? asUuid(record.archivedBy) : null,
    });
  }

  /** Insert-only (Patient has no update use case yet) — matches Office/UserAccount's toOrmForInsert convention. */
  static toOrmForInsert(patient: Patient): PatientOrmEntity {
    const record = new PatientOrmEntity();
    record.id = patient.id;
    record.officeId = patient.officeId;
    record.patientNumber = patient.patientNumber;
    record.status = patient.status;
    record.dateOfBirth = patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : null;
    record.sex = patient.sex;
    record.nationality = patient.nationality;
    record.contactUnavailable = patient.contactUnavailable;
    record.createdAt = patient.createdAt;
    record.createdBy = patient.createdBy;
    record.updatedAt = patient.createdAt;
    record.updatedBy = patient.createdBy;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
