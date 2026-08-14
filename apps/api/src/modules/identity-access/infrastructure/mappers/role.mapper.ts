import { asUuid } from "@dentix/kernel";
import { Role } from "../../domain/entities/role.entity";
import { RoleOrmEntity } from "../persistence/role.orm-entity";

export class RoleMapper {
  static toDomain(record: RoleOrmEntity): Role {
    return Role.reconstitute({
      id: asUuid(record.id),
      officeId: asUuid(record.officeId),
      code: record.code,
      name: record.name,
    });
  }

  static toOrmForInsert(role: Role, createdBy: string | null): RoleOrmEntity {
    const record = new RoleOrmEntity();
    record.id = role.id;
    record.officeId = role.officeId;
    record.code = role.code;
    record.name = role.name;
    record.createdAt = new Date();
    record.createdBy = createdBy;
    record.updatedAt = new Date();
    record.updatedBy = null;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
