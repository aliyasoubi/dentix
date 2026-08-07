import { randomBytes } from "crypto";
import { EnvelopeEncryptionService } from "./envelope-encryption.service";

describe("EnvelopeEncryptionService", () => {
  const originalKey = process.env.SESSION_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
  });

  afterAll(() => {
    process.env.SESSION_ENCRYPTION_KEY = originalKey;
  });

  function createInitialized(): EnvelopeEncryptionService {
    const service = new EnvelopeEncryptionService();
    service.onModuleInit();
    return service;
  }

  it("round-trips a plaintext value", () => {
    const service = createInitialized();
    const plaintext = "the-pkce-code-verifier-value";
    expect(service.decrypt(service.encrypt(plaintext))).toBe(plaintext);
  });

  it("never leaks the plaintext into the encrypted output", () => {
    const service = createInitialized();
    const plaintext = "super-secret-nonce-value";
    expect(service.encrypt(plaintext)).not.toContain(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const service = createInitialized();
    const a = service.encrypt("same-value");
    const b = service.encrypt("same-value");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered ciphertext instead of returning corrupted plaintext", () => {
    const service = createInitialized();
    const encrypted = service.encrypt("original-value");
    const parts = encrypted.split(".");
    const tampered = [parts[0], parts[1], Buffer.from("tampered!!").toString("base64url")].join(".");
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it("fails fast if SESSION_ENCRYPTION_KEY is missing", () => {
    delete process.env.SESSION_ENCRYPTION_KEY;
    const service = new EnvelopeEncryptionService();
    expect(() => service.onModuleInit()).toThrow(/SESSION_ENCRYPTION_KEY is not set/);
  });

  it("fails fast if SESSION_ENCRYPTION_KEY is the wrong length", () => {
    process.env.SESSION_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64url");
    const service = new EnvelopeEncryptionService();
    expect(() => service.onModuleInit()).toThrow(/32 bytes/);
  });

  it("cannot decrypt with a different key than it was encrypted with", () => {
    const service = createInitialized();
    const encrypted = service.encrypt("cross-key-value");

    process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
    const otherService = createInitialized();

    expect(() => otherService.decrypt(encrypted)).toThrow();
  });
});
