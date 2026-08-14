import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTHORIZATION_PORT } from "../../application/ports/authorization.port";
import type { AuthorizationPort } from "../../application/ports/authorization.port";
import { PermissionCode } from "../../domain/value-objects/permission-code";
import { REQUIRE_PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { RequestWithSession } from "./session.guard";

/**
 * Must run after SessionGuard (reads `request.currentSession`, same
 * dependency CsrfGuard already has on it — see that guard's own comment).
 * A route with no `@RequirePermission()` decorator passes through
 * untouched, so this is safe to apply globally later without every
 * existing route needing a decorator added first.
 *
 * CLAUDE.md invariant 7 ("object-level checks on every mutation"): the
 * permission check is a fresh call through AuthorizationPort on every
 * request, resolved from `currentSession.userId`/`officeId` — never a
 * claim trusted from the session token itself.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTHORIZATION_PORT) private readonly authorization: AuthorizationPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<PermissionCode | undefined>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const session = request.currentSession;
    if (!session) {
      throw new Error("PermissionGuard used on a route without SessionGuard");
    }

    const allowed = await this.authorization.hasPermission(session.userId, session.officeId, required);
    if (!allowed) {
      throw new ForbiddenException("MISSING_PERMISSION");
    }
    return true;
  }
}
