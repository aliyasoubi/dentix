import { TransactionContext } from "@dentix/kernel";
import { AuditEvent } from "../entities/audit-event.entity";

export interface AuditEventRepository {
  /**
   * Pass `tx` whenever this write must land in the same transaction as the
   * state change it's recording — a use case's own runInTransaction()
   * callback receives the context to thread through for exactly this.
   */
  create(event: AuditEvent, tx?: TransactionContext): Promise<void>;
}

export const AUDIT_EVENT_REPOSITORY = Symbol("AUDIT_EVENT_REPOSITORY");
