import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { BootstrapConfig, BootstrapConfigService } from "./bootstrap-config.service";

const VALID_CONFIG: BootstrapConfig = {
  locale: "fa-IR",
  dir: "rtl",
  calendarDisplay: "JALALI",
  timezone: "Asia/Tehran",
  money: { defaultUnit: "TOMAN", showUnitLabel: true },
  apiBaseUrl: "/api/v1",
  appVersion: "0.5.0",
};

describe("BootstrapConfigService", () => {
  let service: BootstrapConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BootstrapConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it("loads and exposes the fixed v1 config", async () => {
    const loadPromise = service.load();
    httpMock.expectOne("/api/v1/bootstrap").flush(VALID_CONFIG);
    await loadPromise;

    expect(service.config()).toEqual(VALID_CONFIG);
  });

  it("moneyConfig reflects the loaded money unit", async () => {
    const loadPromise = service.load();
    httpMock
      .expectOne("/api/v1/bootstrap")
      .flush({ ...VALID_CONFIG, money: { defaultUnit: "RIAL", showUnitLabel: true } });
    await loadPromise;

    expect(service.moneyConfig).toEqual({ defaultUnit: "RIAL" });
  });

  it("moneyConfig throws if read before load() resolves — no silent wrong default", () => {
    expect(() => service.moneyConfig).toThrow(/read before load/);
  });

  // UX-DS-001 §2.1's fixed values are meant to be validated, not trusted —
  // this is the safety net catching drift (a misconfigured server), not
  // decorative defensive code.
  it("rejects a locale mismatch instead of silently accepting it", async () => {
    const loadPromise = service.load();
    httpMock.expectOne("/api/v1/bootstrap").flush({ ...VALID_CONFIG, locale: "en-US" });
    await expect(loadPromise).rejects.toThrow(/Bootstrap config mismatch/);
  });

  it("rejects a direction mismatch instead of silently accepting it", async () => {
    const loadPromise = service.load();
    httpMock.expectOne("/api/v1/bootstrap").flush({ ...VALID_CONFIG, dir: "ltr" });
    await expect(loadPromise).rejects.toThrow(/Bootstrap config mismatch/);
  });

  it("rejects a calendar mismatch instead of silently accepting it", async () => {
    const loadPromise = service.load();
    httpMock.expectOne("/api/v1/bootstrap").flush({ ...VALID_CONFIG, calendarDisplay: "GREGORIAN" });
    await expect(loadPromise).rejects.toThrow(/Bootstrap config mismatch/);
  });
});
