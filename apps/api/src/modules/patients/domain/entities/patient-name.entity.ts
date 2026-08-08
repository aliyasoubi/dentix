import { normalizeForSearch, Uuid } from "@dentix/kernel";

export type PatientNameType = "native" | "latin";

export interface PatientNameProps {
  readonly id: Uuid;
  readonly patientId: Uuid;
  readonly nameType: PatientNameType;
  readonly originalValue: string;
  readonly normalizedValue: string;
  readonly isCurrent: boolean;
  readonly createdAt: Date;
  readonly createdBy: Uuid;
}

/**
 * Append-only, like oidc_authorization_request: a rename inserts a new
 * current row and flips the old one's is_current rather than overwriting
 * — no rename use case exists yet in S4, so isCurrent is always true
 * today, but the shape is already what a future rename needs.
 */
export class PatientName {
  private constructor(private readonly props: PatientNameProps) {}

  static reconstitute(props: PatientNameProps): PatientName {
    return new PatientName(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly nameType: PatientNameType;
    readonly value: string;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientName {
    const trimmed = params.value.trim();
    if (trimmed.length === 0) {
      throw new Error("patient name value must not be empty");
    }
    return new PatientName({
      id: params.id,
      patientId: params.patientId,
      nameType: params.nameType,
      originalValue: trimmed,
      normalizedValue: normalizeForSearch(trimmed),
      isCurrent: true,
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

  get nameType(): PatientNameType {
    return this.props.nameType;
  }

  get originalValue(): string {
    return this.props.originalValue;
  }

  get normalizedValue(): string {
    return this.props.normalizedValue;
  }

  get isCurrent(): boolean {
    return this.props.isCurrent;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get createdBy(): Uuid {
    return this.props.createdBy;
  }
}
