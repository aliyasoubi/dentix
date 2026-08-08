import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

/**
 * Shared platform filter (originally identity-access-only — auth.
 * controller.ts was its first consumer, applying it fixed the guard-vs-
 * handler {statusCode,message,error} vs {code} inconsistency the external
 * S3 review flagged; patients.controller.ts is the second, at which point
 * "one controller's private filter" stopped being an accurate name for
 * it). Normalizes every thrown HttpException — including ones a guard
 * throws before a handler body even runs — to the same `{code}` shape a
 * handler that constructs its own JSON response already used by hand.
 *
 * Not the full envelope in 04-architecture/05-api-guidelines.md
 * (`messageKey`/`correlationId`/`details`) — those need localization-key
 * and request-tracing infrastructure that doesn't exist anywhere in the
 * app yet. This closes the concrete {code}-vs-{message} inconsistency,
 * not the whole API's error contract.
 */
@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const code =
      typeof body === "string" ? body : ((body as { message?: unknown }).message ?? exception.message);
    response.status(status).json({ code });
  }
}
