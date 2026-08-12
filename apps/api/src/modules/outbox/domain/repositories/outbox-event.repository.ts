import { TransactionContext, Uuid } from "@dentix/kernel";
import { OutboxEvent } from "../entities/outbox-event.entity";

export interface OutboxEventRepository {
  /**
   * Pass `tx` whenever this write must land in the same transaction as the
   * domain change it's recording (03-module-boundaries.md: "one use case =
   * one transaction + outbox/audit writes").
   */
  create(event: OutboxEvent, tx?: TransactionContext): Promise<void>;

  /**
   * ADR-006 / 08-transaction-event-semantics.md: "A publisher claims rows
   * using FOR UPDATE SKIP LOCKED." `tx` is required, not optional — the
   * claim is only meaningful as a row lock held for a transaction's
   * lifetime; a caller that doesn't commit or roll back promptly holds
   * those rows unavailable to every other claimer for exactly that long.
   */
  claimBatch(limit: number, tx: TransactionContext): Promise<OutboxEvent[]>;

  markPublished(ids: readonly Uuid[], publishedAt: Date, tx?: TransactionContext): Promise<void>;
}

export const OUTBOX_EVENT_REPOSITORY = Symbol("OUTBOX_EVENT_REPOSITORY");
