import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { asUuid } from "@dentix/kernel";
import { In, Repository } from "typeorm";
import { PermissionRecord, PermissionRepository } from "../../domain/repositories/permission.repository";
import { PermissionCode } from "../../domain/value-objects/permission-code";
import { PermissionOrmEntity } from "./permission.orm-entity";

function toRecord(entity: PermissionOrmEntity): PermissionRecord {
  return { id: asUuid(entity.id), code: entity.code as PermissionCode };
}

@Injectable()
export class TypeOrmPermissionRepository implements PermissionRepository {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly repository: Repository<PermissionOrmEntity>,
  ) {}

  async findByCode(code: PermissionCode): Promise<PermissionRecord | null> {
    const record = await this.repository.findOne({ where: { code } });
    return record ? toRecord(record) : null;
  }

  async findByCodes(codes: readonly PermissionCode[]): Promise<readonly PermissionRecord[]> {
    if (codes.length === 0) {
      return [];
    }
    const records = await this.repository.find({ where: { code: In(codes as string[]) } });
    return records.map(toRecord);
  }

  async findAll(): Promise<readonly PermissionRecord[]> {
    const records = await this.repository.find();
    return records.map(toRecord);
  }
}
