import { canonicalizeIranianNationalCode, canonicalizePassportNumber, Uuid } from "@dentix/kernel";

export type PatientIdentifierType = "national_code" | "passport";

export interface PatientIdentifierProps {
  readonly id: Uuid;
  readonly patientId: Uuid;
  readonly identifierType: PatientIdentifierType;
  readonly originalValue: string;
  readonly normalizedValue: string;
  readonly createdAt: Date;
  readonly createdBy: Uuid;
}

/**
 * R1's fuller patient-registry build (deferred by CreatePatients1786220061080's
 * own comment): national code or passport, per 01-patient-management.md's
 * "Optional fields" — "only when legally and operationally justified", now
 * extended to international patients (which document applies is
 * Patient.nationality's call, not this entity's — see
 * CreatePatientUseCase). Always optional; a missing value never blocks
 * patient registration, and uniqueness across patients is intentionally not
 * enforced here (the data model calls it "policy-controlled", and no
 * office-policy config exists yet to control it — not built ahead of a
 * proven need, same reasoning ResolveEffectivePermissionsUseCase used for
 * permission_version caching).
 */
export class PatientIdentifier {
  private constructor(private readonly props: PatientIdentifierProps) {}

  static reconstitute(props: PatientIdentifierProps): PatientIdentifier {
    return new PatientIdentifier(props);
  }

  /**
   * `identifierType` is the caller's decision (CreatePatientUseCase derives
   * it from the patient's nationality), not inferred here from the value's
   * shape — a passport number and a national code can both be plain digits,
   * so guessing which one `rawValue` is would be fragile where the caller
   * already knows for certain.
   */
  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly identifierType: PatientIdentifierType;
    readonly rawValue: string;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientIdentifier {
    const normalized =
      params.identifierType === "national_code"
        ? canonicalizeIranianNationalCode(params.rawValue)
        : canonicalizePassportNumber(params.rawValue);
    if (!normalized) {
      throw new Error(
        params.identifierType === "national_code"
          ? "value is not a checksum-valid Iranian national code"
          : "value is not a recognizable passport number",
      );
    }
    return new PatientIdentifier({
      id: params.id,
      patientId: params.patientId,
      identifierType: params.identifierType,
      originalValue: params.rawValue.trim(),
      normalizedValue: normalized,
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

  get identifierType(): PatientIdentifierType {
    return this.props.identifierType;
  }

  get originalValue(): string {
    return this.props.originalValue;
  }

  get normalizedValue(): string {
    return this.props.normalizedValue;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get createdBy(): Uuid {
    return this.props.createdBy;
  }
}
