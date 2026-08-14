import { asUuid } from "@dentix/kernel";
import {
  PermissionExceptionEffect,
  UserPermissionException,
} from "../../domain/entities/user-permission-exception.entity";
import { PermissionCode } from "../../domain/value-objects/permission-code";
import { UserPermissionExceptionOrmEntity } from "../persistence/user-permission-exception.orm-entity";

export class UserPermissionExceptionMapper {
  /**
   * The ORM row stores `permissionId` (a FK), not the code the domain
   * entity works with — `permissionCode` has to come from whatever join or
   * lookup the repository already did to resolve it, the same way
   * `toOrmForInsert` below takes a resolved `permissionId` rather than
   * looking it up itself.
   */
  static toDomain(
    record: UserPermissionExceptionOrmEntity,
    permissionCode: PermissionCode,
  ): UserPermissionException {
    return UserPermissionException.reconstitute({
      id: asUuid(record.id),
      officeUserId: asUuid(record.officeUserId),
      permissionCode,
      effect: record.effect as PermissionExceptionEffect,
      reason: record.reason,
      effectiveAt: record.effectiveAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
    });
  }

  static toOrmForInsert(
    exception: UserPermissionException,
    permissionId: string,
    createdBy: string | null,
  ): UserPermissionExceptionOrmEntity {
    const record = new UserPermissionExceptionOrmEntity();
    record.id = exception.id;
    record.officeUserId = exception.officeUserId;
    record.permissionId = permissionId;
    record.effect = exception.effect;
    record.reason = exception.reason;
    record.effectiveAt = new Date();
    record.expiresAt = exception.expiresAt;
    record.createdAt = new Date();
    record.createdBy = createdBy;
    record.revokedAt = null;
    record.revokedBy = null;
    return record;
  }
}
