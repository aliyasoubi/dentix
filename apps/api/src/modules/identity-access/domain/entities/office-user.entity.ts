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
 * (09-authentication-session-architecture.md, login step 5). Creating one
 * is out of S3's scope — see the dev-only bootstrap script; a real
 * admin-facing "invite/link a user" use case is a later slice.
 */
export class OfficeUser {
  private constructor(private readonly props: OfficeUserProps) {}

  static reconstitute(props: OfficeUserProps): OfficeUser {
    return new OfficeUser(props);
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
