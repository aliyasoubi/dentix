import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";

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
export class SessionTokenService {
  /** 256 bits — comfortably above the 128-bit floor the spec sets. */
  generateOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
