import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal } from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatTableModule } from "@angular/material/table";
import { AuthService } from "../../core/auth/auth.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";
import {
  CreatePatientResponse,
  PatientSearchResult,
  PatientsApiService,
} from "./patients-api.service";

const KNOWN_ERROR_CODES = new Set(["NATIVE_NAME_REQUIRED", "INVALID_PHONE", "CONTACT_REQUIRED"]);

/** Validators.required only rejects an empty string, not "   " — the backend trims before checking, the form must match or a whitespace-only name would round-trip to the server before being rejected. */
function requiredNonBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length === 0 ? { required: true } : null;
}

@Component({
  selector: "app-patients-page",
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    TranslatePipe,
  ],
  templateUrl: "./patients-page.html",
  styleUrl: "./patients-page.scss",
})
export class PatientsPage {
  private readonly api = inject(PatientsApiService);
  private readonly translation = inject(TranslationService);
  protected readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly displayedColumns = ["patientNumber", "nativeName", "latinName", "phone"];

  protected readonly form = this.formBuilder.nonNullable.group({
    nativeName: ["", [Validators.required, requiredNonBlank]],
    latinName: [""],
    phone: [""],
    contactUnavailable: [false],
    sex: ["unspecified" as "male" | "female" | "unspecified"],
  });

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly lastCreated = signal<CreatePatientResponse & { name: string } | null>(null);

  protected readonly searchQuery = signal("");
  protected readonly searching = signal(false);
  protected readonly results = signal<PatientSearchResult[]>([]);
  protected readonly hasSearched = signal(false);

  constructor() {
    void this.runSearch("");
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.lastCreated.set(null);

    const value = this.form.getRawValue();
    try {
      const created = await this.api.create({
        nativeName: value.nativeName,
        latinName: value.latinName || null,
        phone: value.phone || null,
        contactUnavailable: value.contactUnavailable,
        sex: value.sex,
      });
      this.lastCreated.set({ ...created, name: value.nativeName });
      this.form.reset({ nativeName: "", latinName: "", phone: "", contactUnavailable: false, sex: "unspecified" });
      await this.runSearch(this.searchQuery());
    } catch (error) {
      this.submitError.set(this.describeError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async onSearchInput(value: string): Promise<void> {
    this.searchQuery.set(value);
    await this.runSearch(value);
  }

  private async runSearch(query: string): Promise<void> {
    this.searching.set(true);
    try {
      this.results.set(await this.api.search(query));
    } finally {
      this.searching.set(false);
      this.hasSearched.set(true);
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const code = (error.error as { code?: string } | null)?.code;
      if (code && KNOWN_ERROR_CODES.has(code)) {
        return this.translation.translate(`patients.form.error.${code}`);
      }
    }
    return this.translation.translate("common.error.generic");
  }
}
