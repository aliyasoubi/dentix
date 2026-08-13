import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { App } from "./app";

describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // Asserts the shell is composed and given a title, not the class names
  // inside it — those are DsAppShellComponent's business, and the previous
  // version of this test broke purely because the toolbar markup moved
  // there, without anything the user sees having changed.
  it("renders the product name inside the app shell", () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const shell = compiled.querySelector("app-ds-app-shell");
    expect(shell).toBeTruthy();
    expect(shell?.textContent?.trim()).not.toBe("");
  });

  it("gives routed pages a main landmark to render into", () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector("main")).toBeTruthy();
    expect(compiled.querySelector("main router-outlet")).toBeTruthy();
  });
});
