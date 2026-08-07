import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OidcAuthorizationRequest } from "../../domain/entities/oidc-authorization-request.entity";
import { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import { OidcAuthorizationRequestMapper } from "../mappers/oidc-authorization-request.mapper";
import { OidcAuthorizationRequestOrmEntity } from "./oidc-authorization-request.orm-entity";

@Injectable()
export class TypeOrmOidcAuthorizationRequestRepository implements OidcAuthorizationRequestRepository {
  constructor(
    @InjectRepository(OidcAuthorizationRequestOrmEntity)
    private readonly repository: Repository<OidcAuthorizationRequestOrmEntity>,
  ) {}

  async findByStateHash(stateHash: string): Promise<OidcAuthorizationRequest | null> {
    const record = await this.repository.findOne({ where: { stateHash } });
    return record ? OidcAuthorizationRequestMapper.toDomain(record) : null;
  }

  async create(request: OidcAuthorizationRequest): Promise<void> {
    await this.repository.insert(OidcAuthorizationRequestMapper.toOrm(request));
  }

  async markUsed(request: OidcAuthorizationRequest): Promise<void> {
    await this.repository.save(OidcAuthorizationRequestMapper.toOrm(request));
  }
}
