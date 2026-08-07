import { Uuid } from "@dentix/kernel";

export type UserAccountState = "active" | "disabled";

export interface UserAccountProps {
  readonly id: Uuid;
  readonly externalSubject: string;
  readonly issuer: string;
  readonly displayName: string;
  readonly state: UserAccountState;
}

/**
 * Identity link only. Dentix never stores a password, MFA secret, or
 * provider token here — those belong to the OIDC provider
 * (09-authentication-session-architecture.md, "Recovery and administration").
 */
export class UserAccount {
  private constructor(private readonly props: UserAccountProps) {}

  static reconstitute(props: UserAccountProps): UserAccount {
    return new UserAccount(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly externalSubject: string;
    readonly issuer: string;
    readonly displayName: string;
  }): UserAccount {
    if (params.externalSubject.trim().length === 0) {
      throw new Error("external subject must not be empty");
    }
    if (params.issuer.trim().length === 0) {
      throw new Error("issuer must not be empty");
    }
    return new UserAccount({ ...params, state: "active" });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get externalSubject(): string {
    return this.props.externalSubject;
  }

  get issuer(): string {
    return this.props.issuer;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get state(): UserAccountState {
    return this.props.state;
  }

  isActive(): boolean {
    return this.props.state === "active";
  }
}
