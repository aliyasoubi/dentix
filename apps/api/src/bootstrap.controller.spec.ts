import { BootstrapController } from "./bootstrap.controller";

describe("BootstrapController", () => {
  const controller = new BootstrapController();

  // UX-DS-001 §2.1's approved defaults — the whole point of this endpoint
  // is that these are exactly what the shell validates before it renders.
  it("returns the fixed v1 locale, direction, and calendar", () => {
    const config = controller.get();
    expect(config.locale).toBe("fa-IR");
    expect(config.dir).toBe("rtl");
    expect(config.calendarDisplay).toBe("JALALI");
  });

  it("returns the office timezone (CLAUDE.md: explicit Asia/Tehran, never browser-inferred)", () => {
    expect(controller.get().timezone).toBe("Asia/Tehran");
  });

  it("returns a money config with the unit label always shown", () => {
    const config = controller.get();
    expect(config.money.defaultUnit).toBe("TOMAN");
    expect(config.money.showUnitLabel).toBe(true);
  });

  it("returns a relative apiBaseUrl, never an absolute host (same-origin design)", () => {
    expect(controller.get().apiBaseUrl).toBe("/api/v1");
  });

  it("returns a non-empty appVersion", () => {
    expect(controller.get().appVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
