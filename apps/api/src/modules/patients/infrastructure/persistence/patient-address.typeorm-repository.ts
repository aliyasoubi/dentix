import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
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

  async upsert(
    params: { readonly address: PatientAddress; readonly updatedBy: Uuid; readonly now: Date },
    tx?: TransactionContext,
  ): Promise<void> {
    const repo = repositoryFor(this.repository, tx);
    const { address } = params;
    const result = await repo.update(
      { patientId: address.patientId },
      {
        province: address.province,
        city: address.city,
        district: address.district,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        postalCode: address.postalCode,
        deliveryNotes: address.deliveryNotes,
        updatedAt: params.now,
        updatedBy: params.updatedBy,
        version: () => '"version" + 1',
      },
    );
    if (!result.affected) {
      await repo.insert(PatientAddressMapper.toOrmForInsert(address));
    }
  }

  async remove(patientId: Uuid, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).delete({ patientId });
  }
}
