import { Uuid } from "@dentix/kernel";

export interface PatientAddressProps {
  readonly id: Uuid;
  readonly patientId: Uuid;
  readonly province: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly postalCode: string | null;
  readonly deliveryNotes: string | null;
  readonly createdAt: Date;
  readonly createdBy: Uuid;
  readonly updatedAt: Date;
  readonly updatedBy: Uuid;
  readonly version: number;
  readonly archivedAt: Date | null;
  readonly archivedBy: Uuid | null;
}

/**
 * R1's fuller patient-registry build (deferred by CreatePatients1786220061080's
 * own comment). Unlike patient_name/patient_contact/patient_identifier this
 * is NOT append-only: 01-patient-management.md describes one current
 * address per patient with no mention of a "current" flag or history, so
 * it takes the same mutable shape as `patient` itself (full audit column
 * set, no office_id — inherited transitively through patientId, same as
 * every other patient-child table in this module). Every field is free
 * text and optional: 01-patient-management.md asks for structure that
 * "remains usable for foreign or nonstandard addresses", which rules out
 * strict Iran-only formatting or checksum rules here. No update use case
 * exists yet — this slice only ever creates — but the version/archived
 * columns are already the shape a future edit needs, same reasoning
 * Patient's own "no mutators yet" comment gives.
 */
export class PatientAddress {
  private constructor(private readonly props: PatientAddressProps) {}

  static reconstitute(props: PatientAddressProps): PatientAddress {
    return new PatientAddress(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly patientId: Uuid;
    readonly province?: string | null;
    readonly city?: string | null;
    readonly district?: string | null;
    readonly addressLine1?: string | null;
    readonly addressLine2?: string | null;
    readonly postalCode?: string | null;
    readonly deliveryNotes?: string | null;
    readonly createdBy: Uuid;
    readonly now: Date;
  }): PatientAddress {
    const trimOrNull = (value: string | null | undefined): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    return new PatientAddress({
      id: params.id,
      patientId: params.patientId,
      province: trimOrNull(params.province),
      city: trimOrNull(params.city),
      district: trimOrNull(params.district),
      addressLine1: trimOrNull(params.addressLine1),
      addressLine2: trimOrNull(params.addressLine2),
      postalCode: trimOrNull(params.postalCode),
      deliveryNotes: trimOrNull(params.deliveryNotes),
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

  get patientId(): Uuid {
    return this.props.patientId;
  }

  get province(): string | null {
    return this.props.province;
  }

  get city(): string | null {
    return this.props.city;
  }

  get district(): string | null {
    return this.props.district;
  }

  get addressLine1(): string | null {
    return this.props.addressLine1;
  }

  get addressLine2(): string | null {
    return this.props.addressLine2;
  }

  get postalCode(): string | null {
    return this.props.postalCode;
  }

  get deliveryNotes(): string | null {
    return this.props.deliveryNotes;
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

  /** True when every field is empty — the use case's signal that no address row is worth creating. */
  get isEmpty(): boolean {
    return (
      !this.props.province &&
      !this.props.city &&
      !this.props.district &&
      !this.props.addressLine1 &&
      !this.props.addressLine2 &&
      !this.props.postalCode &&
      !this.props.deliveryNotes
    );
  }
}
