import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import { In, Repository } from "typeorm";
import { RolePermissionRepository } from "../../domain/repositories/role-permission.repository";
import { repositoryFor } from "../../../../platform/typeorm-transaction";
import { RolePermissionOrmEntity } from "./role-permission.orm-entity";

@Injectable()
export class TypeOrmRolePermissionRepository implements RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermissionOrmEntity)
    private readonly repository: Repository<RolePermissionOrmEntity>,
  ) {}

  async grant(roleId: Uuid, permissionId: Uuid, tx?: TransactionContext): Promise<void> {
    const record = new RolePermissionOrmEntity();
    record.id = randomUUID();
    record.roleId = roleId;
    record.permissionId = permissionId;
    record.createdAt = new Date();
    await repositoryFor(this.repository, tx).insert(record);
  }

  async findPermissionIdsByRoleIds(roleIds: readonly Uuid[]): Promise<readonly Uuid[]> {
    if (roleIds.length === 0) {
      return [];
    }
    const records = await this.repository.find({ where: { roleId: In([...roleIds]) } });
    return records.map((record) => asUuid(record.permissionId));
  }
}
