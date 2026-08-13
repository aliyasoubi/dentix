import { Uuid } from "@dentix/kernel";

/**
 * Stable, English, machine-parseable — never a sentence. New actions add a
 * new literal here, they don't repurpose an existing one (04-data-model.md:
 * "Business status values are stable English codes controlled by
 * migrations or domain code").
 */
export type AuditAction =
  | "login_succeeded"
  | "login_failed"
  | "logout"
  | "session_revoked_account_inactive"
  | "session_revoked_membership_inactive"
  | "patient_created"
  | "office_user_added";

export interface AuditEventProps {
  readonly id: Uuid;
  readonly officeId: Uuid | null;
  readonly actorUserId: Uuid | null;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: Uuid | null;
  readonly detail: string | null;
  readonly occurredAt: Date;
}

/**
 * Minimal slice of the target `audit_event` shape in 04-data-model.md
 * (which also has patient linkage, correlation ID, and an integrity hash
 * — those are for the clinical/financial modules that need them; nothing
 * in identity-access does yet, so this doesn't build them speculatively).
 * Append-only: no mutators, no update path, matches "audit rows are
 * append-only to application roles" in the same doc.
 */
export class AuditEvent {
  private constructor(private readonly props: AuditEventProps) {}

  static reconstitute(props: AuditEventProps): AuditEvent {
    return new AuditEvent(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly officeId: Uuid | null;
    readonly actorUserId: Uuid | null;
    readonly action: AuditAction;
    readonly entityType: string;
    readonly entityId: Uuid | null;
    readonly detail: string | null;
    readonly now: Date;
  }): AuditEvent {
    return new AuditEvent({ ...params, occurredAt: params.now });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get officeId(): Uuid | null {
    return this.props.officeId;
  }

  get actorUserId(): Uuid | null {
    return this.props.actorUserId;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): Uuid | null {
    return this.props.entityId;
  }

  get detail(): string | null {
    return this.props.detail;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }
}
