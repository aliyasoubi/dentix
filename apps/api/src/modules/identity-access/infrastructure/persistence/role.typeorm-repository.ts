import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
import { In, Repository } from "typeorm";
import { Role } from "../../domain/entities/role.entity";
import { RoleRepository } from "../../domain/repositories/role.repository";
import { RoleMapper } from "../mappers/role.mapper";
import { RoleOrmEntity } from "./role.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly repository: Repository<RoleOrmEntity>,
  ) {}

  async findByOfficeIdAndCode(officeId: Uuid, code: string): Promise<Role | null> {
    const record = await this.repository.findOne({ where: { officeId, code } });
    return record ? RoleMapper.toDomain(record) : null;
  }

  async findByIds(ids: readonly Uuid[]): Promise<readonly Role[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.repository.find({ where: { id: In([...ids]) } });
    return records.map((record) => RoleMapper.toDomain(record));
  }

  async create(role: Role, createdBy: Uuid | null, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(RoleMapper.toOrmForInsert(role, createdBy));
  }
}
