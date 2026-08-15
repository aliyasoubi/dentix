import { asUuid } from "@dentix/kernel";
import { PatientAddress } from "../../domain/entities/patient-address.entity";
import { PatientAddressOrmEntity } from "../persistence/patient-address.orm-entity";

export class PatientAddressMapper {
  static toDomain(record: PatientAddressOrmEntity): PatientAddress {
    return PatientAddress.reconstitute({
      id: asUuid(record.id),
      patientId: asUuid(record.patientId),
      province: record.province,
      city: record.city,
      district: record.district,
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2,
      postalCode: record.postalCode,
      deliveryNotes: record.deliveryNotes,
      createdAt: record.createdAt,
      createdBy: asUuid(record.createdBy),
      updatedAt: record.updatedAt,
      updatedBy: asUuid(record.updatedBy),
      version: record.version,
      archivedAt: record.archivedAt,
      archivedBy: record.archivedBy ? asUuid(record.archivedBy) : null,
    });
  }

  static toOrmForInsert(address: PatientAddress): PatientAddressOrmEntity {
    const record = new PatientAddressOrmEntity();
    record.id = address.id;
    record.patientId = address.patientId;
    record.province = address.province;
    record.city = address.city;
    record.district = address.district;
    record.addressLine1 = address.addressLine1;
    record.addressLine2 = address.addressLine2;
    record.postalCode = address.postalCode;
    record.deliveryNotes = address.deliveryNotes;
    record.createdAt = address.createdAt;
    record.createdBy = address.createdBy;
    record.updatedAt = address.createdAt;
    record.updatedBy = address.createdBy;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
