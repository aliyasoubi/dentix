import { Uuid } from "@dentix/kernel";

/**
 * The tenant root. Every office-scoped table carries office_id; this table
 * doesn't, because it IS the office (04-architecture/04-data-model.md,
 * "Identity and tenancy").
 */
export interface OfficeProps {
  readonly id: Uuid;
  readonly code: string;
  readonly timezone: string;
  readonly isActive: boolean;
  readonly version: number;
}

export class Office {
  private constructor(private readonly props: OfficeProps) {}

  static reconstitute(props: OfficeProps): Office {
    return new Office(props);
  }

  static create(params: { readonly id: Uuid; readonly code: string; readonly timezone: string }): Office {
    if (params.code.trim().length === 0) {
      throw new Error("Office code must not be empty");
    }
    return new Office({
      id: params.id,
      code: params.code,
      timezone: params.timezone,
      isActive: true,
      version: 1,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get code(): string {
    return this.props.code;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get version(): number {
    return this.props.version;
  }
}
