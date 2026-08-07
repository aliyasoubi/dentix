import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { UserSession } from "../../domain/entities/user-session.entity";
import { ResolveActiveSessionUseCase } from "../../application/use-cases/resolve-active-session.use-case";
import { SESSION_COOKIE_NAME } from "../http/cookies";

export interface RequestWithSession extends Request {
  currentSession?: UserSession;
}

/**
 * 09-authentication-session-architecture.md, "Authorization", step 1:
 * "Active-session validation." Attaches the resolved session to the
 * request for @CurrentSession() and CsrfGuard to read; CsrfGuard must run
 * after this one.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly resolveActiveSession: ResolveActiveSessionUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const sessionToken = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
    if (!sessionToken) {
      throw new UnauthorizedException("NO_SESSION");
    }

    const result = await this.resolveActiveSession.execute({ sessionToken });
    if (!result.ok) {
      throw new UnauthorizedException(result.code);
    }

    request.currentSession = result.value;
    return true;
  }
}
