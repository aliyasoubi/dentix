import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
import { Repository } from "typeorm";
import { UserAccount } from "../../domain/entities/user-account.entity";
import { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import { UserAccountMapper } from "../mappers/user-account.mapper";
import { UserAccountOrmEntity } from "./user-account.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmUserAccountRepository implements UserAccountRepository {
  constructor(
    @InjectRepository(UserAccountOrmEntity)
    private readonly repository: Repository<UserAccountOrmEntity>,
  ) {}

  async findByExternalIdentity(issuer: string, externalSubject: string): Promise<UserAccount | null> {
    const record = await this.repository.findOne({ where: { issuer, externalSubject } });
    return record ? UserAccountMapper.toDomain(record) : null;
  }

  async findById(id: Uuid): Promise<UserAccount | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? UserAccountMapper.toDomain(record) : null;
  }

  async create(userAccount: UserAccount, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(UserAccountMapper.toOrmForInsert(userAccount));
  }
}
