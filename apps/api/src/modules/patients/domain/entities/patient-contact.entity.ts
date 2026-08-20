import { canonicalizeEmail, canonicalizeIranianMobile, Uuid } from "@dentix/kernel";

export type PatientContactType = "mobile_phone" | "email";

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
 * R1's fuller patient_contact build (deferred by S4's own comment): phone
 * and email, each at most one row per patient — home/work phone and
 * multi-contact preference ordering remain out of scope. `isPreferred` is
 * always true for the one row of each type that exists: findDetailById
 * and search() both join on `(contact_type, is_preferred = true)`
 * together, never `is_preferred` alone, precisely so a phone row and an
 * email row coexisting never multiplies either query's result set.
 */
export class PatientContact {
  private constructor(private readonly props: PatientContactProps) {}

  static reconstitute(props: PatientContactProps): PatientContact {
    return new PatientContact(props);
  }

  /**
   * `contactType` is the caller's decision, not inferred from the value's
   * shape — same reasoning as PatientIdentifier.create()'s own comment.
   */
  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly contactType: PatientContactType;
    readonly rawValue: string;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientContact {
    const normalized =
      params.contactType === "mobile_phone"
        ? canonicalizeIranianMobile(params.rawValue)
        : canonicalizeEmail(params.rawValue);
    if (!normalized) {
      throw new Error(
        params.contactType === "mobile_phone"
          ? "value is not a recognizable Iranian mobile number"
          : "value is not a recognizable email address",
      );
    }
    return new PatientContact({
      id: params.id,
      patientId: params.patientId,
      contactType: params.contactType,
      originalValue: params.rawValue.trim(),
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
