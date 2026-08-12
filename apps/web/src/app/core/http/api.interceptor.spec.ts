import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../auth/auth.service";
import { apiInterceptor } from "./api.interceptor";

describe("apiInterceptor", () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  async function expectRejection(promise: Promise<unknown>): Promise<void> {
    await expect(promise).rejects.toBeDefined();
  }

  it("marks the session expired when an ordinary API call 401s", async () => {
    // mockImplementation: the real method redirects the browser, which this
    // test isn't exercising — see auth.service.spec.ts for that behavior.
    const expired = vi.spyOn(auth, "markSessionExpired").mockImplementation(() => undefined);
    const request = firstValueFrom(http.get("/api/v1/patients"));
    httpMock
      .expectOne("/api/v1/patients")
      .flush({ code: "NO_SESSION" }, { status: 401, statusText: "Unauthorized" });
    await expectRejection(request);

    expect(expired).toHaveBeenCalledTimes(1);
  });

  // whoami is how AuthService probes for a session — a 401 there is a normal
  // "not logged in" answer. Reacting to it would recurse: 401 →
  // markSessionExpired → guard re-checks → whoami → 401.
  it("does NOT mark the session expired when whoami itself 401s", async () => {
    const expired = vi.spyOn(auth, "markSessionExpired");
    const request = firstValueFrom(http.get("/api/v1/auth/whoami"));
    httpMock
      .expectOne("/api/v1/auth/whoami")
      .flush({ code: "NO_SESSION" }, { status: 401, statusText: "Unauthorized" });
    await expectRejection(request);

    expect(expired).not.toHaveBeenCalled();
  });

  it("leaves non-401 failures alone", async () => {
    const expired = vi.spyOn(auth, "markSessionExpired");
    const request = firstValueFrom(http.get("/api/v1/patients"));
    httpMock
      .expectOne("/api/v1/patients")
      .flush({ code: "BOOM" }, { status: 500, statusText: "Server Error" });
    await expectRejection(request);

    expect(expired).not.toHaveBeenCalled();
  });

  it("attaches credentials to API calls", async () => {
    const request = firstValueFrom(http.get("/api/v1/patients"));
    const req = httpMock.expectOne("/api/v1/patients");
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
    await request;
  });

  it("ignores non-API URLs entirely", async () => {
    const request = firstValueFrom(http.get("/i18n/fa-IR/common.json"));
    const req = httpMock.expectOne("/i18n/fa-IR/common.json");
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
    await request;
  });
});
