import { canonicalizeIranianNationalCode, Uuid } from "@dentix/kernel";

export type PatientIdentifierType = "national_code";

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
 * own comment): the national code only, per 01-patient-management.md's
 * "Optional fields" — "only when legally and operationally justified".
 * Always optional; a missing value never blocks patient registration, and
 * uniqueness across patients is intentionally not enforced here (the data
 * model calls it "policy-controlled", and no office-policy config exists
 * yet to control it — not built ahead of a proven need, same reasoning
 * ResolveEffectivePermissionsUseCase used for permission_version caching).
 */
export class PatientIdentifier {
  private constructor(private readonly props: PatientIdentifierProps) {}

  static reconstitute(props: PatientIdentifierProps): PatientIdentifier {
    return new PatientIdentifier(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly rawNationalCode: string;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientIdentifier {
    const normalized = canonicalizeIranianNationalCode(params.rawNationalCode);
    if (!normalized) {
      throw new Error("value is not a checksum-valid Iranian national code");
    }
    return new PatientIdentifier({
      id: params.id,
      patientId: params.patientId,
      identifierType: "national_code",
      originalValue: params.rawNationalCode.trim(),
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
