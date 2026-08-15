import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { PatientAddress } from "../../domain/entities/patient-address.entity";
import { PatientAddressRepository } from "../../domain/repositories/patient-address.repository";
import { PatientAddressMapper } from "../mappers/patient-address.mapper";
import { PatientAddressOrmEntity } from "./patient-address.orm-entity";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmPatientAddressRepository implements PatientAddressRepository {
  constructor(
    @InjectRepository(PatientAddressOrmEntity)
    private readonly repository: Repository<PatientAddressOrmEntity>,
  ) {}

  async create(address: PatientAddress, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(PatientAddressMapper.toOrmForInsert(address));
  }
}
