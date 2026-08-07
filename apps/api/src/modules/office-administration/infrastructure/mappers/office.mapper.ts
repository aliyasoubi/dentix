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

  /**
   * Insert only — see OfficeRepository.create for why there is no
   * toOrmForUpdate counterpart yet. created_at/created_by are set fresh
   * here deliberately; version is left unset for TypeORM's @VersionColumn
   * to initialize.
   */
  static toOrmForInsert(office: Office): OfficeOrmEntity {
    const record = new OfficeOrmEntity();
    record.id = office.id;
    record.code = office.code;
    record.timezone = office.timezone;
    record.isActive = office.isActive;
    record.createdAt = new Date();
    record.createdBy = null;
    record.updatedAt = new Date();
    record.updatedBy = null;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
