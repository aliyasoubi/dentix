import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { TranslationService } from "../i18n/translation.service";
import { ApiErrorMessageService, extractApiErrorCode } from "./api-error-message.service";

const STUB_TRANSLATIONS: Record<string, string> = {
  "patients.form.error.INVALID_PHONE": "شماره موبایل معتبر نیست.",
  "common.error.generic": "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

function httpError(body: unknown, status = 400): HttpErrorResponse {
  return new HttpErrorResponse({ error: body, status, statusText: "Bad Request" });
}

describe("extractApiErrorCode", () => {
  it("reads the code from the documented error body", () => {
    expect(extractApiErrorCode(httpError({ code: "INVALID_PHONE" }))).toBe("INVALID_PHONE");
  });

  it.each([
    ["a non-HttpErrorResponse throw", new Error("boom")],
    ["a null body", httpError(null)],
    ["a string body (e.g. an HTML error page from the proxy)", httpError("<html>502</html>")],
    ["a body with no code", httpError({ message: "nope" })],
    ["a non-string code", httpError({ code: 42 })],
    ["an empty code", httpError({ code: "" })],
  ])("returns null for %s", (_label, error) => {
    expect(extractApiErrorCode(error)).toBeNull();
  });
});

describe("ApiErrorMessageService", () => {
  let service: ApiErrorMessageService;
  const options = { knownCodes: new Set(["INVALID_PHONE"]), keyPrefix: "patients.form.error." };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: TranslationService, useClass: StubTranslationService }],
    });
    service = TestBed.inject(ApiErrorMessageService);
  });

  it("translates a known code", () => {
    expect(service.describe(httpError({ code: "INVALID_PHONE" }), options)).toBe("شماره موبایل معتبر نیست.");
  });

  // The reason for the allow-list: without it an unmapped code would render
  // a raw identifier to the user.
  it("falls back to the generic message for a code it has no copy for", () => {
    expect(service.describe(httpError({ code: "INTERNAL_ERROR" }), options)).toBe(
      "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
    );
  });

  it("falls back to the generic message for a network-level failure", () => {
    expect(service.describe(new Error("offline"), options)).toBe("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  });
});
