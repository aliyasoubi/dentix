import { TransactionContext } from "@dentix/kernel";
import { OidcAuthorizationRequest } from "../entities/oidc-authorization-request.entity";

export interface OidcAuthorizationRequestRepository {
  findByStateHash(stateHash: string): Promise<OidcAuthorizationRequest | null>;
  create(request: OidcAuthorizationRequest): Promise<void>;
  markUsed(request: OidcAuthorizationRequest, tx?: TransactionContext): Promise<void>;
}

export const OIDC_AUTHORIZATION_REQUEST_REPOSITORY = Symbol("OIDC_AUTHORIZATION_REQUEST_REPOSITORY");
