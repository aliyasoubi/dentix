import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { PatientName } from "../../domain/entities/patient-name.entity";
import { PatientNameRepository } from "../../domain/repositories/patient-name.repository";
import { PatientNameMapper } from "../mappers/patient-name.mapper";
import { PatientNameOrmEntity } from "./patient-name.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmPatientNameRepository implements PatientNameRepository {
  constructor(
    @InjectRepository(PatientNameOrmEntity)
    private readonly repository: Repository<PatientNameOrmEntity>,
  ) {}

  async create(name: PatientName, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(PatientNameMapper.toOrm(name));
  }
}
