import { Uuid } from "@dentix/kernel";
import { PermissionCode } from "../../domain/value-objects/permission-code";

/**
 * identity-access's exposed authorization surface — 07-context-module-
 * map.md: "patients may call identity-access authorization port" (and,
 * eventually, every module that guards an action). Other modules depend on
 * this interface, never on identity-access's repositories directly
 * (03-module-boundaries.md, "never import another module's repository");
 * `lint:arch`'s no-cross-module-internals rule is what actually enforces
 * that, this port is what makes following it possible.
 */
export interface AuthorizationPort {
  hasPermission(userId: Uuid, officeId: Uuid, code: PermissionCode): Promise<boolean>;
}

export const AUTHORIZATION_PORT = Symbol("AUTHORIZATION_PORT");
