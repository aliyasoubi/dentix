import { Uuid } from "@dentix/kernel";

export interface OfficeUserProps {
  readonly id: Uuid;
  readonly officeId: Uuid;
  readonly userId: Uuid;
  readonly permissionVersion: number;
  readonly isActive: boolean;
  /**
   * Deliberately a single boolean, not a role code or a link into a
   * permission table. The real target — 01-product/04-roles-and-
   * permissions.md's six roles and per-family permissions — is Release 1
   * scope (07-plans/release-1-foundation.md) and gated on DISC-003, which
   * hasn't been approved yet (docs/open-decisions.md). This flag exists
   * only to gate the one sensitive action that needed *something*: adding
   * another office user (AddOfficeUserUseCase). It answers "can this
   * person add other people," nothing more — it is not a stand-in for the
   * coming permission model and must not grow additional meanings.
   */
  readonly isOfficeAdmin: boolean;
}

/**
 * Office membership. Login reads this to decide which office a session
 * belongs to and to snapshot permissionVersion into the new session
 * (09-authentication-session-architecture.md, login step 5).
 */
export class OfficeUser {
  private constructor(private readonly props: OfficeUserProps) {}

  static reconstitute(props: OfficeUserProps): OfficeUser {
    return new OfficeUser(props);
  }

  /**
   * New memberships always start as a non-admin — per ADR-007's "Recovery
   * and administration" section, Dentix links an already-existing external
   * identity rather than provisioning credentials, and granting admin
   * status is a separate, deliberate act (not a parameter here) so it
   * can't be set accidentally by whoever fills in the add-user form.
   */
  static create(params: { readonly id: Uuid; readonly officeId: Uuid; readonly userId: Uuid }): OfficeUser {
    return new OfficeUser({
      id: params.id,
      officeId: params.officeId,
      userId: params.userId,
      permissionVersion: 1,
      isActive: true,
      isOfficeAdmin: false,
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

  get isOfficeAdmin(): boolean {
    return this.props.isOfficeAdmin;
  }
}
