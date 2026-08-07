/** Port over EnvelopeEncryptionService (infrastructure/crypto). */
export interface EncryptionPort {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}

export const ENCRYPTION_PORT = Symbol("ENCRYPTION_PORT");
