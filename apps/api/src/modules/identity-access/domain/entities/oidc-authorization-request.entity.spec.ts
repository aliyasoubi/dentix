import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { OIDC_AUTHORIZATION_REQUEST_TTL_MS } from "../value-objects/session-policy";
import { OidcAuthorizationRequest } from "./oidc-authorization-request.entity";

describe("OidcAuthorizationRequest", () => {
  const now = new Date("2026-08-07T10:00:00Z");

  function createRequest(returnPath = "/dashboard") {
    return OidcAuthorizationRequest.create({
      id: asUuid(randomUUID()),
      stateHash: "state-hash",
      nonceEncrypted: "encrypted-nonce",
      pkceVerifierEncrypted: "encrypted-verifier",
      returnPath,
      now,
    });
  }

  it("is usable immediately after creation", () => {
    expect(createRequest().isUsable(now)).toBe(true);
  });

  it("rejects a return path that isn't an absolute same-origin path", () => {
    expect(() => createRequest("https://evil.example.com/steal")).toThrow(/absolute same-origin path/i);
    expect(() => createRequest("evil.example.com")).toThrow();
  });

  it("expires after the configured TTL", () => {
    const request = createRequest();
    const afterTtl = new Date(now.getTime() + OIDC_AUTHORIZATION_REQUEST_TTL_MS + 1);
    expect(request.isUsable(afterTtl)).toBe(false);
  });

  it("is not usable a second time after markUsed — prevents callback replay", () => {
    const request = createRequest();
    request.markUsed(now);
    expect(request.isUsable(now)).toBe(false);
    expect(request.usedAt?.getTime()).toBe(now.getTime());
  });
});
