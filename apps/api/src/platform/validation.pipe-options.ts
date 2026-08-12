import { BadRequestException, Logger, ValidationPipeOptions } from "@nestjs/common";
import type { ValidationError } from "class-validator";

const logger = new Logger("RequestValidation");

/**
 * Collects the dotted property paths that failed, without ever touching the
 * submitted values — field names are safe to log, patient-entered content is
 * not (CLAUDE.md: "No PHI or secrets in logs, URLs, commits, or error
 * messages").
 */
function failedPropertyPaths(errors: readonly ValidationError[], prefix = ""): string[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const nested = error.children?.length ? failedPropertyPaths(error.children, path) : [];
    return error.constraints ? [path, ...nested] : nested;
  });
}

/**
 * Shared global-pipe configuration (registered as APP_PIPE in app.module.ts
 * so it applies to every app built from AppModule — including the ones each
 * api-spec constructs, which is the only way the tests exercise the same
 * request pipeline production does).
 *
 * `transform` is on but `enableImplicitConversion` is deliberately off: with
 * implicit conversion, class-validator would happily coerce `"no"` into a
 * boolean and `"12"` into a number, which is exactly the class of silent
 * type-laundering that let `contactUnavailable: "no"` bypass the
 * CONTACT_REQUIRED rule. Types must arrive correct, not be guessed at.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  // 05-api-guidelines.md: "Backend messages are not localized prose" — the
  // API returns a stable, locale-neutral code and the UI owns the wording.
  // class-validator's default is an array of English sentences, which would
  // have leaked straight through HttpErrorFilter as the `code` value.
  exceptionFactory: (errors: ValidationError[]) => {
    const paths = failedPropertyPaths(errors);
    if (paths.length > 0) {
      logger.warn(`Request rejected by validation; offending fields: ${paths.join(", ")}`);
    }
    return new BadRequestException("VALIDATION_FAILED");
  },
};
