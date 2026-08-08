import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

/**
 * Normalizes every error this controller produces — including ones thrown
 * by SessionGuard/CsrfGuard before a handler body even runs — to the same
 * `{code}` shape `whoami` already used by hand. The external review
 * flagged these disagreeing: NestJS's default filter renders a thrown
 * HttpException as `{statusCode, message, error}`, which doesn't match.
 *
 * Not the full envelope in 04-architecture/05-api-guidelines.md
 * (`messageKey`/`correlationId`/`details`) — those need localization-key
 * and request-tracing infrastructure that doesn't exist anywhere in the
 * app yet. This closes the one concrete inconsistency the review named,
 * not the whole API's error contract; a real cross-cutting filter is a
 * later, app-wide concern.
 */
@Catch(HttpException)
export class AuthErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const code =
      typeof body === "string" ? body : ((body as { message?: unknown }).message ?? exception.message);
    response.status(status).json({ code });
  }
}
