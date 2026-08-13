import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
import { Repository } from "typeorm";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { OfficeUserMapper } from "../mappers/office-user.mapper";
import { OfficeUserOrmEntity } from "./office-user.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmOfficeUserRepository implements OfficeUserRepository {
  constructor(
    @InjectRepository(OfficeUserOrmEntity)
    private readonly repository: Repository<OfficeUserOrmEntity>,
  ) {}

  async findByUserId(userId: Uuid): Promise<OfficeUser | null> {
    const record = await this.repository.findOne({ where: { userId } });
    return record ? OfficeUserMapper.toDomain(record) : null;
  }

  async create(officeUser: OfficeUser, createdBy: Uuid | null, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(OfficeUserMapper.toOrmForInsert(officeUser, createdBy));
  }
}
