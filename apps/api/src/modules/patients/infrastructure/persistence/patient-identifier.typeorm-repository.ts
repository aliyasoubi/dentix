import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { PatientIdentifier } from "../../domain/entities/patient-identifier.entity";
import { PatientIdentifierRepository } from "../../domain/repositories/patient-identifier.repository";
import { PatientIdentifierMapper } from "../mappers/patient-identifier.mapper";
import { PatientIdentifierOrmEntity } from "./patient-identifier.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmPatientIdentifierRepository implements PatientIdentifierRepository {
  constructor(
    @InjectRepository(PatientIdentifierOrmEntity)
    private readonly repository: Repository<PatientIdentifierOrmEntity>,
  ) {}

  async create(identifier: PatientIdentifier, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(PatientIdentifierMapper.toOrm(identifier));
  }
}
