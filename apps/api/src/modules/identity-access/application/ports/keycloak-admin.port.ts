/**
 * Port over the identity provider's admin API — read-only lookup only.
 * 09-authentication-session-architecture.md, "Recovery and administration":
 * "Dentix administrators may link or disable an external identity but never
 * set or view passwords, MFA secrets, access tokens, or refresh tokens."
 * This port exists to find an *already-existing* Keycloak account so
 * AddOfficeUserUseCase can link it — it has no method that creates a user,
 * sets a credential, or reads one. Provisioning the Keycloak-side account
 * itself (username, initial credential, TOTP requirement) stays a Keycloak
 * admin console action, same as the dev realm's own seed script does it.
 */
export interface KeycloakAdminUser {
  /** The OIDC `sub` claim — what UserAccount.externalSubject stores. */
  readonly subject: string;
  readonly email: string;
  readonly enabled: boolean;
}

export interface KeycloakAdminPort {
  /** Null when no account with that email exists in the realm. */
  findUserByEmail(email: string): Promise<KeycloakAdminUser | null>;
}

export const KEYCLOAK_ADMIN_PORT = Symbol("KEYCLOAK_ADMIN_PORT");
