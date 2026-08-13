import { HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { TranslationService } from "../i18n/translation.service";

/**
 * Turns a failed HTTP call into text a user can read.
 *
 * Lives in core rather than in the patients feature because the shape it
 * decodes is the whole API's error contract (05-api-guidelines.md: the body
 * carries a stable, locale-neutral `code`; the UI owns the wording), so every
 * feature added after this one needs exactly the same decode-and-fall-back
 * behaviour.
 *
 * The allow-list is the point. Echoing whatever `code` the server sent into a
 * translation lookup would render a raw identifier like `INTERNAL_ERROR` to
 * the user for anything unmapped, so callers pass the codes they have actually
 * written copy for and everything else becomes the generic message.
 */
@Injectable({ providedIn: "root" })
export class ApiErrorMessageService {
  private readonly translation = inject(TranslationService);

  describe(error: unknown, options: { knownCodes: ReadonlySet<string>; keyPrefix: string }): string {
    const code = extractApiErrorCode(error);
    if (code !== null && options.knownCodes.has(code)) {
      return this.translation.translate(`${options.keyPrefix}${code}`);
    }
    return this.translation.translate("common.error.generic");
  }
}

/**
 * Pulls the stable error code out of a failed response, or null when the
 * failure has no code to read — a network error, a non-HTTP throw, or a body
 * that isn't the documented error shape (an HTML error page from a proxy, for
 * instance, which is a real possibility now that a reverse proxy sits in
 * front of the API).
 */
export function extractApiErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = error.error;
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" && code.length > 0 ? code : null;
}
