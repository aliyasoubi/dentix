import { asUuid } from "@dentix/kernel";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { OfficeUserOrmEntity } from "../persistence/office-user.orm-entity";

export class OfficeUserMapper {
  static toDomain(record: OfficeUserOrmEntity): OfficeUser {
    return OfficeUser.reconstitute({
      id: asUuid(record.id),
      officeId: asUuid(record.officeId),
      userId: asUuid(record.userId),
      permissionVersion: record.permissionVersion,
      isActive: record.isActive,
    });
  }

  /** createdBy is the acting admin who granted this membership — the one column here with a real actor, unlike the bootstrap script's own insert. */
  static toOrmForInsert(officeUser: OfficeUser, createdBy: string | null): OfficeUserOrmEntity {
    const record = new OfficeUserOrmEntity();
    record.id = officeUser.id;
    record.officeId = officeUser.officeId;
    record.userId = officeUser.userId;
    record.permissionVersion = officeUser.permissionVersion;
    record.isActive = officeUser.isActive;
    record.createdAt = new Date();
    record.createdBy = createdBy;
    record.updatedAt = new Date();
    record.updatedBy = null;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
