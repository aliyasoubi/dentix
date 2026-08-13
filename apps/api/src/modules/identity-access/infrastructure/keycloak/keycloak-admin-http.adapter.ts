import { Injectable } from "@nestjs/common";
import { KeycloakAdminPort, KeycloakAdminUser } from "../../application/ports/keycloak-admin.port";

interface KeycloakUserRepresentation {
  readonly id: string;
  readonly email?: string;
  readonly enabled: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Plain fetch against Keycloak's admin REST API — the same endpoints
 * keycloak/seed-dev-user.sh and ops/local/fetch-client-secret.sh already
 * use, just called from the running process instead of a one-off script.
 * No token caching: this backs one low-frequency admin action (adding a
 * user), so re-authenticating each call is simpler and avoids a stale-token
 * class of bug for a handful of requests a month.
 *
 * KEYCLOAK_ADMIN_URL is deliberately a separate variable from
 * OIDC_ISSUER_URL, not derived from it: the issuer is the public HTTPS
 * origin every browser and the OIDC discovery document use, but ADR-007
 * wants "admin console reachable only from an allow-listed network path".
 * In the compose stack that means this points at the internal service
 * address (http://keycloak:8080), which also sidesteps needing this
 * server-to-server call to carry a TLS story of its own.
 */
@Injectable()
export class KeycloakAdminHttpAdapter implements KeycloakAdminPort {
  async findUserByEmail(email: string): Promise<KeycloakAdminUser | null> {
    const adminUrl = requireEnv("KEYCLOAK_ADMIN_URL").replace(/\/$/, "");
    const realm = requireEnv("KEYCLOAK_REALM");

    const token = await this.getAdminToken(adminUrl);

    const response = await fetch(
      `${adminUrl}/admin/realms/${encodeURIComponent(realm)}/users?email=${encodeURIComponent(email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new Error(`Keycloak admin user lookup failed: ${response.status} ${response.statusText}`);
    }

    const users = (await response.json()) as KeycloakUserRepresentation[];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (!match) {
      return null;
    }

    return { subject: match.id, email: match.email ?? email, enabled: match.enabled };
  }

  private async getAdminToken(adminUrl: string): Promise<string> {
    const adminRealm = process.env["KEYCLOAK_ADMIN_REALM"] ?? "master";
    const response = await fetch(`${adminUrl}/realms/${adminRealm}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: requireEnv("KEYCLOAK_ADMIN"),
        password: requireEnv("KEYCLOAK_ADMIN_PASSWORD"),
      }),
    });
    if (!response.ok) {
      throw new Error(`Keycloak admin authentication failed: ${response.status} ${response.statusText}`);
    }
    const body = (await response.json()) as { access_token: string };
    return body.access_token;
  }
}
