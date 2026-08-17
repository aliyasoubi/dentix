import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
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

  async upsert(identifier: PatientIdentifier, tx?: TransactionContext): Promise<void> {
    const repo = repositoryFor(this.repository, tx);
    const result = await repo.update(
      { patientId: identifier.patientId },
      {
        identifierType: identifier.identifierType,
        originalValue: identifier.originalValue,
        normalizedValue: identifier.normalizedValue,
      },
    );
    if (!result.affected) {
      await repo.insert(PatientIdentifierMapper.toOrm(identifier));
    }
  }

  async remove(patientId: Uuid, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).delete({ patientId });
  }
}
