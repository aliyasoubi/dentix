export interface PkcePair {
  readonly verifier: string;
  readonly challenge: string;
}

/** Port over SessionTokenService (infrastructure/crypto) — pure token/hash operations, no I/O. */
export interface SessionTokenPort {
  generateOpaqueToken(): string;
  hash(token: string): string;
  generatePkcePair(): PkcePair;
}

export const SESSION_TOKEN_PORT = Symbol("SESSION_TOKEN_PORT");
