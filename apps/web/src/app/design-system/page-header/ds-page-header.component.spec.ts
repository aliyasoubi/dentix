import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DsPageHeaderComponent } from "./ds-page-header.component";

@Component({
  imports: [DsPageHeaderComponent],
  template: `
    <app-ds-page-header [title]="title" [description]="description">
      <button type="button">دکمه</button>
    </app-ds-page-header>
  `,
})
class HostComponent {
  title = "بیماران";
  description: string | undefined;
}

async function createHost(description?: string): Promise<ComponentFixture<HostComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.description = description;
  fixture.detectChanges();
  return fixture;
}

describe("DsPageHeaderComponent", () => {
  it("renders the title", async () => {
    const fixture = await createHost();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("بیماران");
  });

  it("does not render a description element when none is given", async () => {
    const fixture = await createHost();
    const description = (fixture.nativeElement as HTMLElement).querySelector(".ds-page-header__description");
    expect(description).toBeNull();
  });

  it("renders a given description", async () => {
    const fixture = await createHost("توضیح کوتاه");
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("توضیح کوتاه");
  });

  it("projects the primary action content", async () => {
    const fixture = await createHost();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("دکمه");
  });
});
