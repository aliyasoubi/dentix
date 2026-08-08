import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { AuditEvent } from "../../domain/entities/audit-event.entity";
import { AuditEventRepository } from "../../domain/repositories/audit-event.repository";
import { AuditEventMapper } from "../mappers/audit-event.mapper";
import { AuditEventOrmEntity } from "./audit-event.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmAuditEventRepository implements AuditEventRepository {
  constructor(
    @InjectRepository(AuditEventOrmEntity)
    private readonly repository: Repository<AuditEventOrmEntity>,
  ) {}

  async create(event: AuditEvent, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(AuditEventMapper.toOrm(event));
  }
}
