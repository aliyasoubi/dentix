import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Uuid } from "@dentix/kernel";
import { Repository } from "typeorm";
import { Office } from "../../domain/entities/office.entity";
import { OfficeRepository } from "../../domain/repositories/office.repository";
import { OfficeMapper } from "../mappers/office.mapper";
import { OfficeOrmEntity } from "./office.orm-entity";

@Injectable()
export class TypeOrmOfficeRepository implements OfficeRepository {
  constructor(
    @InjectRepository(OfficeOrmEntity)
    private readonly repository: Repository<OfficeOrmEntity>,
  ) {}

  async findById(id: Uuid): Promise<Office | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? OfficeMapper.toDomain(record) : null;
  }

  async findByCode(code: string): Promise<Office | null> {
    const record = await this.repository.findOne({ where: { code } });
    return record ? OfficeMapper.toDomain(record) : null;
  }

  async save(office: Office): Promise<void> {
    await this.repository.save(OfficeMapper.toOrmNew(office));
  }
}
