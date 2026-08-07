import { asUuid } from "@dentix/kernel";
import { OidcAuthorizationRequest } from "../../domain/entities/oidc-authorization-request.entity";
import { OidcAuthorizationRequestOrmEntity } from "../persistence/oidc-authorization-request.orm-entity";

export class OidcAuthorizationRequestMapper {
  static toDomain(record: OidcAuthorizationRequestOrmEntity): OidcAuthorizationRequest {
    return OidcAuthorizationRequest.reconstitute({
      id: asUuid(record.id),
      stateHash: record.stateHash,
      nonceEncrypted: record.nonceEncrypted,
      pkceVerifierEncrypted: record.pkceVerifierEncrypted,
      returnPath: record.returnPath,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
    });
  }

  static toOrm(request: OidcAuthorizationRequest): OidcAuthorizationRequestOrmEntity {
    const record = new OidcAuthorizationRequestOrmEntity();
    record.id = request.id;
    record.stateHash = request.stateHash;
    record.nonceEncrypted = request.nonceEncrypted;
    record.pkceVerifierEncrypted = request.pkceVerifierEncrypted;
    record.returnPath = request.returnPath;
    record.createdAt = request.createdAt;
    record.expiresAt = request.expiresAt;
    record.usedAt = request.usedAt;
    return record;
  }
}
