import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { PatientContact } from "../../domain/entities/patient-contact.entity";
import { PatientContactRepository } from "../../domain/repositories/patient-contact.repository";
import { PatientContactMapper } from "../mappers/patient-contact.mapper";
import { PatientContactOrmEntity } from "./patient-contact.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmPatientContactRepository implements PatientContactRepository {
  constructor(
    @InjectRepository(PatientContactOrmEntity)
    private readonly repository: Repository<PatientContactOrmEntity>,
  ) {}

  async create(contact: PatientContact, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(PatientContactMapper.toOrm(contact));
  }
}
