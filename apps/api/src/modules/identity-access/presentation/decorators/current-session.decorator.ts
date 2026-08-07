import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserSession } from "../../domain/entities/user-session.entity";
import { RequestWithSession } from "../guards/session.guard";

/** Only valid on a route guarded by SessionGuard — that's what sets it. */
export const CurrentSession = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserSession => {
  const request = ctx.switchToHttp().getRequest<RequestWithSession>();
  if (!request.currentSession) {
    throw new Error("@CurrentSession() used on a route without SessionGuard");
  }
  return request.currentSession;
});
