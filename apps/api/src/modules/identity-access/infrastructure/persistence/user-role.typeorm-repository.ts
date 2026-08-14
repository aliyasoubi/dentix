import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import { Repository } from "typeorm";
import { UserRoleRepository } from "../../domain/repositories/user-role.repository";
import { repositoryFor } from "../../../../platform/typeorm-transaction";
import { UserRoleOrmEntity } from "./user-role.orm-entity";

@Injectable()
export class TypeOrmUserRoleRepository implements UserRoleRepository {
  constructor(
    @InjectRepository(UserRoleOrmEntity)
    private readonly repository: Repository<UserRoleOrmEntity>,
  ) {}

  async grant(
    officeUserId: Uuid,
    roleId: Uuid,
    createdBy: Uuid | null,
    tx?: TransactionContext,
  ): Promise<void> {
    const record = new UserRoleOrmEntity();
    record.id = randomUUID();
    record.officeUserId = officeUserId;
    record.roleId = roleId;
    record.createdAt = new Date();
    record.createdBy = createdBy;
    await repositoryFor(this.repository, tx).insert(record);
  }

  async revoke(officeUserId: Uuid, roleId: Uuid, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).delete({ officeUserId, roleId });
  }

  async findRoleIdsByOfficeUserId(officeUserId: Uuid): Promise<readonly Uuid[]> {
    const records = await this.repository.find({ where: { officeUserId } });
    return records.map((record) => asUuid(record.roleId));
  }
}
