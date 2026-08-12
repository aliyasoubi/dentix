import { SessionTokenService } from "./session-token.service";

describe("SessionTokenService", () => {
  const service = new SessionTokenService();

  it("generates a token with at least 128 bits of entropy", () => {
    const token = service.generateOpaqueToken();
    const decodedBytes = Buffer.from(token, "base64url").length;
    expect(decodedBytes * 8).toBeGreaterThanOrEqual(128);
  });

  it("generates distinct tokens on each call", () => {
    const a = service.generateOpaqueToken();
    const b = service.generateOpaqueToken();
    expect(a).not.toBe(b);
  });

  it("hashes deterministically, so a presented token can be looked up by re-hashing", () => {
    const token = service.generateOpaqueToken();
    expect(service.hash(token)).toBe(service.hash(token));
  });

  it("never returns the raw token as part of its own hash", () => {
    const token = service.generateOpaqueToken();
    expect(service.hash(token)).not.toContain(token);
  });

  it("produces different hashes for different tokens", () => {
    const a = service.generateOpaqueToken();
    const b = service.generateOpaqueToken();
    expect(service.hash(a)).not.toBe(service.hash(b));
  });

  describe("verifyHash", () => {
    it("accepts the token whose hash matches", () => {
      const token = service.generateOpaqueToken();
      expect(service.verifyHash(token, service.hash(token))).toBe(true);
    });

    it("rejects a token that doesn't hash to the expected value", () => {
      const token = service.generateOpaqueToken();
      const otherHash = service.hash(service.generateOpaqueToken());
      expect(service.verifyHash(token, otherHash)).toBe(false);
    });

    // Regression: the original CsrfGuard code compared hashes with plain
    // `!==`, a timing side-channel (JS string inequality short-circuits at
    // the first differing byte). This doesn't measure timing directly —
    // that would be flaky in a unit test — but it locks in the mismatched-
    // length case that `crypto.timingSafeEqual` throws on if called naively,
    // which a naive migration to it could easily reintroduce as a 500
    // instead of a clean rejection.
    it("rejects rather than throws when the expected hash is a different length", () => {
      expect(service.verifyHash("some-token", "not-a-real-hash")).toBe(false);
    });

    it("rejects an empty expected hash without throwing", () => {
      expect(service.verifyHash("some-token", "")).toBe(false);
    });
  });

  describe("generatePkcePair", () => {
    it("produces a verifier RFC 7636 accepts as valid length (43-128 chars)", () => {
      const { verifier } = service.generatePkcePair();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it("uses only the unreserved character set RFC 7636 requires", () => {
      const { verifier } = service.generatePkcePair();
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it("matches openid-client's own S256 challenge for the same verifier — not just my own math", async () => {
      // Dynamic import: openid-client is ESM-only, see openid-client.adapter.ts.
      const client = await import("openid-client");
      const { verifier, challenge } = service.generatePkcePair();
      const libraryChallenge = await client.calculatePKCECodeChallenge(verifier);
      expect(challenge).toBe(libraryChallenge);
    });

    it("generates a distinct pair on each call", () => {
      const a = service.generatePkcePair();
      const b = service.generatePkcePair();
      expect(a.verifier).not.toBe(b.verifier);
      expect(a.challenge).not.toBe(b.challenge);
    });
  });
});
