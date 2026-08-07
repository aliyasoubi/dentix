import { asUuid } from "@dentix/kernel";
import { Office } from "../../domain/entities/office.entity";
import { OfficeOrmEntity } from "../persistence/office.orm-entity";

export class OfficeMapper {
  static toDomain(record: OfficeOrmEntity): Office {
    return Office.reconstitute({
      id: asUuid(record.id),
      code: record.code,
      timezone: record.timezone,
      isActive: record.isActive,
      version: record.version,
    });
  }

  static toOrmNew(office: Office): OfficeOrmEntity {
    const record = new OfficeOrmEntity();
    record.id = office.id;
    record.code = office.code;
    record.timezone = office.timezone;
    record.isActive = office.isActive;
    record.createdAt = new Date();
    record.createdBy = null;
    record.updatedAt = new Date();
    record.updatedBy = null;
    record.version = office.version;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
