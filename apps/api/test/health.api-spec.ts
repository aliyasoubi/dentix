import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { AppModule } from "../src/app.module";

// API-contract layer (01-workflow.md): proves the app boots and answers over
// HTTP, exactly as `npm run test:api` is meant to for every slice from here on.
describe("Health (API contract)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    await app.init();
  });

  it("GET /health returns ok, unaffected by the /api/v1 prefix", () => {
    return request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" });
  });

  afterEach(async () => {
    await app.close();
  });
});
