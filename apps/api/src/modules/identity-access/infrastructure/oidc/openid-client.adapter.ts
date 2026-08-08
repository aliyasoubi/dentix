import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  AuthorizationRequestParams,
  ExchangedIdentity,
  OidcClientPort,
} from "../../application/ports/oidc-client.port";

// openid-client is ESM-only (package.json "type": "module"). A static
// `import` compiles to `require()` under our CommonJS Jest/ts-jest setup,
// and Jest's own module loader doesn't use Node's newer require(esm)
// interop the way plain `node`/`ts-node` do — it throws "Cannot use import
// statement outside a module" reaching into the package's own file.
// Dynamic import() always goes through Node's real ESM loader regardless
// of the caller's module system, so it works everywhere consistently.
type OpenIdClientModule = typeof import("openid-client");

const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The only file in this module allowed to import `openid-client`
 * (03-module-boundaries.md). Config values are Layer 1 deployment config
 * (06-configuration-catalog.md) — env vars, never the database.
 */
@Injectable()
export class OpenIdClientAdapter implements OidcClientPort, OnModuleInit {
  private client: OpenIdClientModule | undefined;
  private configuration: InstanceType<OpenIdClientModule["Configuration"]> | undefined;
  private redirectUri!: string;

  async onModuleInit(): Promise<void> {
    const issuerUrl = this.requireEnv("OIDC_ISSUER_URL");
    const clientId = this.requireEnv("OIDC_CLIENT_ID");
    const clientSecret = this.requireEnv("OIDC_CLIENT_SECRET");
    this.redirectUri = this.requireEnv("OIDC_REDIRECT_URI");

    this.client = await import("openid-client");
    const issuer = new URL(issuerUrl);

    // openid-client refuses plaintext HTTP by default — correctly, since a
    // downgraded discovery/token endpoint is a real MITM risk in
    // production. Gated on scheme AND hostname, not scheme alone: an
    // http:// scheme check by itself would also silently bypass the
    // safety check for a misconfigured OIDC_ISSUER_URL pointing at a real
    // non-loopback host (e.g. an internal http:// Keycloak reached without
    // TLS termination) — restricting to loopback means that case instead
    // hits openid-client's own "only HTTPS" rejection, which is what
    // should happen. A production https:// issuer is never affected
    // regardless of how other config is set.
    const options =
      issuer.protocol === "http:" && LOOPBACK_HOSTNAMES.has(issuer.hostname)
        ? { execute: [this.client.allowInsecureRequests] }
        : undefined;

    this.configuration = await this.client.discovery(issuer, clientId, clientSecret, undefined, options);
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is not set`);
    }
    return value;
  }

  private requireReady(): {
    client: OpenIdClientModule;
    configuration: InstanceType<OpenIdClientModule["Configuration"]>;
  } {
    if (!this.client || !this.configuration) {
      throw new Error("OpenIdClientAdapter used before onModuleInit ran (OIDC discovery not complete)");
    }
    return { client: this.client, configuration: this.configuration };
  }

  buildAuthorizationUrl(params: AuthorizationRequestParams): URL {
    const { client, configuration } = this.requireReady();
    return client.buildAuthorizationUrl(configuration, {
      redirect_uri: this.redirectUri,
      scope: "openid profile",
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.pkceCodeChallenge,
      code_challenge_method: "S256",
    });
  }

  async exchangeAuthorizationCode(params: {
    readonly callbackUrl: URL;
    readonly expectedState: string;
    readonly expectedNonce: string;
    readonly pkceCodeVerifier: string;
  }): Promise<ExchangedIdentity> {
    const { client, configuration } = this.requireReady();
    const tokens = await client.authorizationCodeGrant(configuration, params.callbackUrl, {
      expectedState: params.expectedState,
      expectedNonce: params.expectedNonce,
      pkceCodeVerifier: params.pkceCodeVerifier,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      // idTokenExpected: true makes this unreachable in practice — narrows
      // the type and fails loudly if a future openid-client version changes
      // that guarantee, instead of proceeding with an unauthenticated identity.
      throw new Error("OIDC token response carried no ID token claims");
    }

    return {
      subject: claims.sub,
      issuer: claims.iss,
      authTime: typeof claims.auth_time === "number" ? new Date(claims.auth_time * 1000) : null,
      authMethods: Array.isArray(claims.amr)
        ? claims.amr.filter((m): m is string => typeof m === "string")
        : null,
    };
  }

  buildEndSessionUrl(params: { readonly postLogoutRedirectUri: string }): URL {
    const { client, configuration } = this.requireReady();
    return client.buildEndSessionUrl(configuration, {
      post_logout_redirect_uri: params.postLogoutRedirectUri,
    });
  }
}
