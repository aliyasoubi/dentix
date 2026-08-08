import { canonicalizeIranianMobile, Uuid } from "@dentix/kernel";

export type PatientContactType = "mobile_phone";

export interface PatientContactProps {
  readonly id: Uuid;
  readonly patientId: Uuid;
  readonly contactType: PatientContactType;
  readonly originalValue: string;
  readonly normalizedValue: string;
  readonly isPreferred: boolean;
  readonly createdAt: Date;
  readonly createdBy: Uuid;
}

/**
 * S4 only models a single mobile-phone contact (01-patient-management.md's
 * minimal subset) — email/home/work phone and multi-contact preference
 * ordering are R1's fuller patient_contact build.
 */
export class PatientContact {
  private constructor(private readonly props: PatientContactProps) {}

  static reconstitute(props: PatientContactProps): PatientContact {
    return new PatientContact(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly rawMobileNumber: string;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientContact {
    const normalized = canonicalizeIranianMobile(params.rawMobileNumber);
    if (!normalized) {
      throw new Error("value is not a recognizable Iranian mobile number");
    }
    return new PatientContact({
      id: params.id,
      patientId: params.patientId,
      contactType: "mobile_phone",
      originalValue: params.rawMobileNumber.trim(),
      normalizedValue: normalized,
      isPreferred: true,
      createdAt: params.now,
      createdBy: params.createdBy,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get patientId(): Uuid {
    return this.props.patientId;
  }

  get contactType(): PatientContactType {
    return this.props.contactType;
  }

  get originalValue(): string {
    return this.props.originalValue;
  }

  get normalizedValue(): string {
    return this.props.normalizedValue;
  }

  get isPreferred(): boolean {
    return this.props.isPreferred;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get createdBy(): Uuid {
    return this.props.createdBy;
  }
}
