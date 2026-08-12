import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
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
   * Every other place a hashed token is checked, it's a DB lookup by hash
   * (an index equality check, not application-code string comparison) — the
   * cookie session token and the OIDC `state` parameter both work that way.
   * CSRF is the one token compared directly in application code, against a
   * value already held on the session, so it's the one place a plain `!==`
   * would actually be a timing side-channel: JS string inequality
   * short-circuits at the first differing byte, which in principle lets an
   * attacker who can fire many CSRF-guarded requests (e.g. POST /auth/logout)
   * and measure latency recover `csrfTokenHash` one byte at a time, then
   * forge a header for a token they never saw. `timingSafeEqual` throws on
   * mismatched lengths rather than comparing, so the length check runs
   * first — the hashes are both SHA-256 hex (64 chars) in the one caller
   * this exists for, but nothing about the type guarantees that upstream.
   */
  verifyHash(candidateToken: string, expectedHash: string): boolean {
    const candidateHash = Buffer.from(this.hash(candidateToken), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return candidateHash.length === expected.length && timingSafeEqual(candidateHash, expected);
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
