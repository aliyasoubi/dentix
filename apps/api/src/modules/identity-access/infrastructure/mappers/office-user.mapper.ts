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
}
