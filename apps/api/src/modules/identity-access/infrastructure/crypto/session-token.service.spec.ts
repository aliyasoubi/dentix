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
});
