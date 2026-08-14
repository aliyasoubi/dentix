import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
import { In, Repository } from "typeorm";
import { UserPermissionException } from "../../domain/entities/user-permission-exception.entity";
import { UserPermissionExceptionRepository } from "../../domain/repositories/user-permission-exception.repository";
import { PermissionCode } from "../../domain/value-objects/permission-code";
import { UserPermissionExceptionMapper } from "../mappers/user-permission-exception.mapper";
import { repositoryFor } from "../../../../platform/typeorm-transaction";
import { PermissionOrmEntity } from "./permission.orm-entity";
import { UserPermissionExceptionOrmEntity } from "./user-permission-exception.orm-entity";

@Injectable()
export class TypeOrmUserPermissionExceptionRepository implements UserPermissionExceptionRepository {
  constructor(
    @InjectRepository(UserPermissionExceptionOrmEntity)
    private readonly repository: Repository<UserPermissionExceptionOrmEntity>,
    // Same module, not a cross-module boundary (03-module-boundaries.md's
    // "never import another module's repository" is about crossing module
    // lines) — resolving permission_id back to its code is this
    // repository's own join to make, the same way a SQL view would.
    @InjectRepository(PermissionOrmEntity)
    private readonly permissions: Repository<PermissionOrmEntity>,
  ) {}

  async create(
    exception: UserPermissionException,
    permissionId: Uuid,
    createdBy: Uuid | null,
    tx?: TransactionContext,
  ): Promise<void> {
    await repositoryFor(this.repository, tx).insert(
      UserPermissionExceptionMapper.toOrmForInsert(exception, permissionId, createdBy),
    );
  }

  async findByOfficeUserId(officeUserId: Uuid): Promise<readonly UserPermissionException[]> {
    const records = await this.repository.find({ where: { officeUserId } });
    if (records.length === 0) {
      return [];
    }
    const permissionIds = [...new Set(records.map((record) => record.permissionId))];
    const permissionRecords = await this.permissions.find({ where: { id: In(permissionIds) } });
    const codeById = new Map(permissionRecords.map((p) => [p.id, p.code as PermissionCode]));

    return records.map((record) => {
      const code = codeById.get(record.permissionId);
      if (!code) {
        // permission is application-owned and never deleted (permission.orm-entity.ts) — an
        // exception referencing a missing permission would mean that invariant broke.
        throw new Error(`user_permission_exception ${record.id} references unknown permission_id`);
      }
      return UserPermissionExceptionMapper.toDomain(record, code);
    });
  }
}
