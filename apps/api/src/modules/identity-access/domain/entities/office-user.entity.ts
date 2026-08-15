import { Uuid } from "@dentix/kernel";

export interface OfficeUserProps {
  readonly id: Uuid;
  readonly officeId: Uuid;
  readonly userId: Uuid;
  readonly permissionVersion: number;
  readonly isActive: boolean;
}

/**
 * Office membership. Login reads this to decide which office a session
 * belongs to and to snapshot permissionVersion into the new session
 * (09-authentication-session-architecture.md, login step 5).
 *
 * Used to also carry `isOfficeAdmin`, a single boolean stopgap for
 * whatever the real permission model (`role`/`permission`/`user_role`/
 * `role_permission`, 04-architecture/04-data-model.md) would eventually
 * be. That model is built now (DISC-003 decided) — what someone can do is
 * entirely a function of the roles granted through `user_role`, resolved
 * fresh on every check via AuthorizationPort, never a flag stored on this
 * row. See migration 1786751604406-DropOfficeUserIsAdmin for the column's
 * actual removal.
 */
export class OfficeUser {
  private constructor(private readonly props: OfficeUserProps) {}

  static reconstitute(props: OfficeUserProps): OfficeUser {
    return new OfficeUser(props);
  }

  static create(params: { readonly id: Uuid; readonly officeId: Uuid; readonly userId: Uuid }): OfficeUser {
    return new OfficeUser({
      id: params.id,
      officeId: params.officeId,
      userId: params.userId,
      permissionVersion: 1,
      isActive: true,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get officeId(): Uuid {
    return this.props.officeId;
  }

  get userId(): Uuid {
    return this.props.userId;
  }

  get permissionVersion(): number {
    return this.props.permissionVersion;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
