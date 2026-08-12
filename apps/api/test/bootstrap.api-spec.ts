import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { AppModule } from "../src/app.module";

interface BootstrapConfigResponseBody {
  readonly locale: string;
  readonly dir: string;
  readonly calendarDisplay: string;
  readonly timezone: string;
  readonly money: { readonly defaultUnit: string; readonly showUnitLabel: boolean };
  readonly apiBaseUrl: string;
  readonly appVersion: string;
}

// 06-configuration-catalog.md Layer 4: proves this really is reachable
// with no session — a user who isn't authenticated yet is exactly who
// needs this endpoint to render the shell that gets them to login.
describe("Bootstrap (API contract)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    await app.init();
  });

  it("GET /api/v1/bootstrap requires no session and returns the fixed v1 config", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/bootstrap").expect(200);
    const body = response.body as BootstrapConfigResponseBody;

    expect(body.locale).toBe("fa-IR");
    expect(body.dir).toBe("rtl");
    expect(body.calendarDisplay).toBe("JALALI");
    expect(body.timezone).toBe("Asia/Tehran");
    expect(body.money).toEqual({ defaultUnit: "TOMAN", showUnitLabel: true });
    expect(body.apiBaseUrl).toBe("/api/v1");
    expect(body.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  afterEach(async () => {
    await app.close();
  });
});
