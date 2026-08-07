import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { SessionTokenService } from "../../infrastructure/crypto/session-token.service";
import { RequestWithSession } from "./session.guard";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * 09-authentication-session-architecture.md, "API and CSRF": "Every unsafe
 * request requires a CSRF token bound to the session and sent in a custom
 * header." Must run after SessionGuard — reads request.currentSession,
 * which only SessionGuard sets.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly sessionTokens: SessionTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    if (!UNSAFE_METHODS.has(request.method)) {
      return true;
    }

    const session = request.currentSession;
    if (!session) {
      // Programmer error, not a client error: CsrfGuard applied without
      // SessionGuard running first. Fail closed either way.
      throw new ForbiddenException("CSRF_CHECK_REQUIRES_SESSION");
    }

    const presentedToken = request.headers[CSRF_HEADER_NAME];
    if (typeof presentedToken !== "string" || presentedToken.length === 0) {
      throw new ForbiddenException("CSRF_TOKEN_MISSING");
    }

    if (this.sessionTokens.hash(presentedToken) !== session.csrfTokenHash) {
      throw new ForbiddenException("CSRF_TOKEN_INVALID");
    }

    return true;
  }
}
