import { Injectable, OnModuleInit } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

/**
 * "Application-layer envelope encryption with a key outside PostgreSQL"
 * (04-architecture/04-data-model.md, Identity and Access) — used for the
 * OIDC nonce and PKCE verifier in oidc_authorization_request. The same
 * pattern is documented as the target for provider_token_record once
 * ADR-014's trigger is hit; this service is written generically enough
 * to be reused there without change.
 *
 * The key lives in SESSION_ENCRYPTION_KEY (Layer 1 deployment config,
 * 06-architecture/06-configuration-catalog.md) — never in the database,
 * never sent to the frontend.
 */
@Injectable()
export class EnvelopeEncryptionService implements OnModuleInit {
  private key: Buffer | undefined;

  onModuleInit(): void {
    const raw = process.env.SESSION_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error(
        "SESSION_ENCRYPTION_KEY is not set. Generate one with: " +
          "node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
      );
    }
    const key = Buffer.from(raw, "base64url");
    if (key.length !== 32) {
      throw new Error(`SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes, got ${key.length}`);
    }
    this.key = key;
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error("EnvelopeEncryptionService used before onModuleInit ran");
    }
    return this.key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.requireKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(
      ".",
    );
  }

  decrypt(encrypted: string): string {
    const parts = encrypted.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed envelope-encrypted value");
    }
    const [ivPart, authTagPart, ciphertextPart] = parts as [string, string, string];
    const iv = Buffer.from(ivPart, "base64url");
    const authTag = Buffer.from(authTagPart, "base64url");
    const ciphertext = Buffer.from(ciphertextPart, "base64url");
    const decipher = createDecipheriv(ALGORITHM, this.requireKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  }
}
