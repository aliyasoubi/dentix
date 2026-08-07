import { Uuid } from "@dentix/kernel";
import { OIDC_AUTHORIZATION_REQUEST_TTL_MS } from "../value-objects/session-policy";

export interface OidcAuthorizationRequestProps {
  readonly id: Uuid;
  readonly stateHash: string;
  readonly nonceEncrypted: string;
  readonly pkceVerifierEncrypted: string;
  readonly returnPath: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
}

/**
 * Single-use, short-lived record of a login attempt in progress
 * (04-architecture/04-data-model.md). The encrypted fields hold the
 * OIDC nonce and PKCE verifier between /auth/login and /auth/callback —
 * this entity only ever sees them already encrypted; encryption itself
 * is an infrastructure concern (infrastructure/crypto).
 */
export class OidcAuthorizationRequest {
  private constructor(private props: OidcAuthorizationRequestProps) {}

  static reconstitute(props: OidcAuthorizationRequestProps): OidcAuthorizationRequest {
    return new OidcAuthorizationRequest(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly stateHash: string;
    readonly nonceEncrypted: string;
    readonly pkceVerifierEncrypted: string;
    readonly returnPath: string;
    readonly now: Date;
  }): OidcAuthorizationRequest {
    // "//host/path" is protocol-relative — browsers resolve it as an
    // absolute URL to a different origin, not a same-origin path, even
    // though it passes a naive startsWith("/") check. A leading backslash
    // gets the same rejection: some browsers normalize \ to / before
    // resolving the URL, so "/\evil.com" can behave like "//evil.com".
    const isSameOriginPath =
      params.returnPath.startsWith("/") &&
      !params.returnPath.startsWith("//") &&
      !params.returnPath.startsWith("/\\");
    if (!isSameOriginPath) {
      throw new Error("returnPath must be an absolute same-origin path");
    }
    return new OidcAuthorizationRequest({
      id: params.id,
      stateHash: params.stateHash,
      nonceEncrypted: params.nonceEncrypted,
      pkceVerifierEncrypted: params.pkceVerifierEncrypted,
      returnPath: params.returnPath,
      createdAt: params.now,
      expiresAt: new Date(params.now.getTime() + OIDC_AUTHORIZATION_REQUEST_TTL_MS),
      usedAt: null,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get stateHash(): string {
    return this.props.stateHash;
  }

  get nonceEncrypted(): string {
    return this.props.nonceEncrypted;
  }

  get pkceVerifierEncrypted(): string {
    return this.props.pkceVerifierEncrypted;
  }

  get returnPath(): string {
    return this.props.returnPath;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  /** Not expired and not already consumed by a prior callback. */
  isUsable(now: Date): boolean {
    return this.props.usedAt === null && now.getTime() <= this.props.expiresAt.getTime();
  }

  markUsed(now: Date): void {
    this.props = { ...this.props, usedAt: now };
  }
}
