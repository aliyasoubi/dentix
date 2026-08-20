import { Uuid } from "@dentix/kernel";

export type PatientStatus = "active" | "inactive" | "deceased" | "duplicate_candidate" | "archived";
export type PatientSex = "male" | "female" | "unspecified";
/**
 * Deliberately binary, not a country picker: the only thing this drives is
 * which identifier document a patient's `identifierNumber` is validated and
 * stored as (patient-identifier.entity.ts) — national code for "iranian",
 * passport for "foreign". A specific country of origin isn't collected;
 * that's a natural later addition if the office ever needs it, not
 * something to build ahead of a proven need.
 */
export type PatientNationality = "iranian" | "foreign";

/**
 * ADR-012's hedge: the UI is Farsi-only today, but the domain shouldn't
 * hard-code that as an unstated assumption. A single-member union is
 * deliberate — there is exactly one valid value until a second locale is
 * ever built, so there is nothing for a form control to choose between
 * yet (see CreatePatientRequestDto's own comment on why no UI exists for
 * this field).
 */
export type PatientPreferredLanguage = "fa-IR";

export interface PatientProps {
  readonly id: Uuid;
  readonly officeId: Uuid;
  readonly patientNumber: number;
  readonly status: PatientStatus;
  /** Nullable — "where known" (01-patient-management.md); S4's UI doesn't collect this yet, S5 adds the Jalali picker onto this same column. */
  readonly dateOfBirth: Date | null;
  readonly sex: PatientSex;
  readonly nationality: PatientNationality;
  /** True only when the patient explicitly has no contact method — never true merely because one wasn't entered. */
  readonly contactUnavailable: boolean;
  readonly occupation: string | null;
  readonly referralSource: string | null;
  readonly preferredLanguage: PatientPreferredLanguage;
  readonly createdAt: Date;
  readonly createdBy: Uuid;
  readonly updatedAt: Date;
  readonly updatedBy: Uuid;
  readonly version: number;
  readonly archivedAt: Date | null;
  readonly archivedBy: Uuid | null;
}

/**
 * Aggregate root for the minimal S4 slice. No mutators yet — R1 adds the
 * update/status-transition use cases; this slice only ever creates.
 */
export class Patient {
  private constructor(private readonly props: PatientProps) {}

  static reconstitute(props: PatientProps): Patient {
    return new Patient(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly officeId: Uuid;
    readonly patientNumber: number;
    readonly dateOfBirth: Date | null;
    readonly sex: PatientSex;
    /** Defaults to "iranian" — the predominant case for this office; a foreign patient is the explicit choice, not the default. */
    readonly nationality?: PatientNationality;
    readonly contactUnavailable: boolean;
    readonly occupation?: string | null;
    readonly referralSource?: string | null;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): Patient {
    const trimOrNull = (value: string | null | undefined): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    return new Patient({
      id: params.id,
      officeId: params.officeId,
      patientNumber: params.patientNumber,
      status: "active",
      dateOfBirth: params.dateOfBirth,
      sex: params.sex,
      nationality: params.nationality ?? "iranian",
      contactUnavailable: params.contactUnavailable,
      occupation: trimOrNull(params.occupation),
      referralSource: trimOrNull(params.referralSource),
      // No parameter to set this — see PatientPreferredLanguage's own comment.
      preferredLanguage: "fa-IR",
      createdAt: params.now,
      createdBy: params.createdBy,
      updatedAt: params.now,
      updatedBy: params.createdBy,
      version: 1,
      archivedAt: null,
      archivedBy: null,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get officeId(): Uuid {
    return this.props.officeId;
  }

  get patientNumber(): number {
    return this.props.patientNumber;
  }

  get status(): PatientStatus {
    return this.props.status;
  }

  get dateOfBirth(): Date | null {
    return this.props.dateOfBirth;
  }

  get sex(): PatientSex {
    return this.props.sex;
  }

  get nationality(): PatientNationality {
    return this.props.nationality;
  }

  get contactUnavailable(): boolean {
    return this.props.contactUnavailable;
  }

  get occupation(): string | null {
    return this.props.occupation;
  }

  get referralSource(): string | null {
    return this.props.referralSource;
  }

  get preferredLanguage(): PatientPreferredLanguage {
    return this.props.preferredLanguage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get createdBy(): Uuid {
    return this.props.createdBy;
  }

  get version(): number {
    return this.props.version;
  }
}
