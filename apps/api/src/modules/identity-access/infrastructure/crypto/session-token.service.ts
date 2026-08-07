import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PkcePair, SessionTokenPort } from "../../application/ports/session-token.port";

export type { PkcePair };

/**
 * 09-authentication-session-architecture.md: "The cookie contains only a
 * random opaque identifier with at least 128 bits of entropy. Session
 * identifiers are hashed before persistence." The same pattern (opaque
 * value to the client, hash stored server-side, looked up by re-hashing
 * the presented value) is reused for CSRF tokens and the OIDC `state`
 * parameter — all three are bearer secrets that must never be
 * reconstructable from what's in the database.
 */
@Injectable()
export class SessionTokenService implements SessionTokenPort {
  /** 256 bits — comfortably above the 128-bit floor the spec sets. */
  generateOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * RFC 7636 S256: verifier is 43-128 chars from the unreserved set;
   * challenge = BASE64URL(SHA256(ASCII(verifier))). Plain Node crypto, not
   * openid-client — the application layer generates this without needing
   * to depend on the OIDC library directly (03-module-boundaries.md).
   */
  generatePkcePair(): PkcePair {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
    return { verifier, challenge };
  }
}
