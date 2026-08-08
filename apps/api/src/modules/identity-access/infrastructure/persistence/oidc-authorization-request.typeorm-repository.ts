import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { OidcAuthorizationRequest } from "../../domain/entities/oidc-authorization-request.entity";
import { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import { OidcAuthorizationRequestMapper } from "../mappers/oidc-authorization-request.mapper";
import { OidcAuthorizationRequestOrmEntity } from "./oidc-authorization-request.orm-entity";
import { repositoryFor } from "./typeorm-transaction";

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

  async markUsed(request: OidcAuthorizationRequest, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).save(OidcAuthorizationRequestMapper.toOrm(request));
  }
}
