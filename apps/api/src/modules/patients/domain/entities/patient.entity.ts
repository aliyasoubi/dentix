import { Uuid } from "@dentix/kernel";

export type PatientStatus = "active" | "inactive" | "deceased" | "duplicate_candidate" | "archived";
export type PatientSex = "male" | "female" | "unspecified";

export interface PatientProps {
  readonly id: Uuid;
  readonly officeId: Uuid;
  readonly patientNumber: number;
  readonly status: PatientStatus;
  /** Nullable — "where known" (01-patient-management.md); S4's UI doesn't collect this yet, S5 adds the Jalali picker onto this same column. */
  readonly dateOfBirth: Date | null;
  readonly sex: PatientSex;
  /** True only when the patient explicitly has no contact method — never true merely because one wasn't entered. */
  readonly contactUnavailable: boolean;
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
    readonly contactUnavailable: boolean;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): Patient {
    return new Patient({
      id: params.id,
      officeId: params.officeId,
      patientNumber: params.patientNumber,
      status: "active",
      dateOfBirth: params.dateOfBirth,
      sex: params.sex,
      contactUnavailable: params.contactUnavailable,
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

  get contactUnavailable(): boolean {
    return this.props.contactUnavailable;
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
