import { Uuid } from "@dentix/kernel";

export interface RoleProps {
  readonly id: Uuid;
  readonly officeId: Uuid;
  readonly code: string;
  readonly name: string;
}

/**
 * An office-owned role — 01-product/04-roles-and-permissions.md: "Roles
 * are templates for capabilities, not hard-coded clinical professions."
 * `code` is the stable, application-referenceable identifier (snake_case,
 * e.g. `dentist`); `name` is plain stored text for now, not a translation
 * row — no role-management UI renders it yet, so building the DB-
 * translation-row plumbing for a label nothing displays would be ahead of
 * an actual need (00-build-sequencing.md's own recurring reasoning).
 * Revisit `name` when that UI exists.
 */
export class Role {
  private constructor(private readonly props: RoleProps) {}

  static reconstitute(props: RoleProps): Role {
    return new Role(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly officeId: Uuid;
    readonly code: string;
    readonly name: string;
  }): Role {
    const code = params.code.trim();
    const name = params.name.trim();
    if (code.length === 0) {
      throw new Error("Role code must not be empty");
    }
    if (name.length === 0) {
      throw new Error("Role name must not be empty");
    }
    return new Role({ id: params.id, officeId: params.officeId, code, name });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get officeId(): Uuid {
    return this.props.officeId;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }
}
