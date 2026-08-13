import { StartLoginUseCase } from "./start-login.use-case";
import type { AuthorizationRequestParams, OidcClientPort } from "../ports/oidc-client.port";
import type { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import type { EncryptionPort } from "../ports/encryption.port";
import type { SessionTokenPort } from "../ports/session-token.port";

describe("StartLoginUseCase", () => {
  function buildUseCase(): {
    useCase: StartLoginUseCase;
    buildAuthorizationUrl: jest.Mock<URL, [AuthorizationRequestParams]>;
    requests: { create: jest.Mock<Promise<void>, [unknown]> };
  } {
    const buildAuthorizationUrl = jest
      .fn<URL, [AuthorizationRequestParams]>()
      .mockReturnValue(new URL("https://kc.local/auth"));
    const oidcClient = {
      buildAuthorizationUrl,
      exchangeAuthorizationCode: jest.fn(),
      buildEndSessionUrl: jest.fn(),
    } as unknown as OidcClientPort;

    const requests = { create: jest.fn<Promise<void>, [unknown]>() };
    const sessionTokens: SessionTokenPort = {
      generateOpaqueToken: jest.fn().mockReturnValue("opaque-token"),
      hash: jest.fn().mockReturnValue("hashed"),
      generatePkcePair: jest.fn().mockReturnValue({ verifier: "verifier", challenge: "challenge" }),
    };
    const encryption: EncryptionPort = {
      encrypt: jest.fn().mockReturnValue("encrypted"),
      decrypt: jest.fn().mockReturnValue("decrypted"),
    };

    const useCase = new StartLoginUseCase(
      oidcClient,
      requests as unknown as OidcAuthorizationRequestRepository,
      sessionTokens,
      encryption,
    );
    return { useCase, buildAuthorizationUrl, requests };
  }

  it("rejects a returnPath that would be an open redirect", async () => {
    const { useCase, requests } = buildUseCase();

    const result = await useCase.execute({ returnPath: "https://evil.example.com/steal" });

    expect(!result.ok && result.code).toBe("INVALID_RETURN_PATH");
    expect(requests.create).not.toHaveBeenCalled();
  });

  describe("forceReauthentication", () => {
    // Without prompt=login the provider can satisfy the request from its
    // existing SSO session and return the ORIGINAL auth_time, which would
    // leave the recent-authentication window exactly as stale as before —
    // an infinite redirect loop for anyone recovering from
    // RECENT_AUTHENTICATION_REQUIRED.
    it("asks the provider to re-authenticate when set", async () => {
      const { useCase, buildAuthorizationUrl } = buildUseCase();

      await useCase.execute({ returnPath: "/office-users", forceReauthentication: true });

      expect(buildAuthorizationUrl.mock.calls[0][0].forceReauthentication).toBe(true);
    });

    it("is not requested for an ordinary login, so SSO still works", async () => {
      const { useCase, buildAuthorizationUrl } = buildUseCase();

      await useCase.execute({ returnPath: "/patients" });

      expect(buildAuthorizationUrl.mock.calls[0][0].forceReauthentication).toBeUndefined();
    });
  });
});
