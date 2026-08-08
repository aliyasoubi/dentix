import { TransactionContext } from "@dentix/kernel";

/**
 * Port over a single-transaction unit of work (03-module-boundaries.md:
 * "one use case = one transaction + outbox/audit writes"). Application/
 * only ever sees the opaque TransactionContext it hands to repository
 * calls inside `work` — the concrete EntityManager it wraps is an
 * infrastructure/ detail (TypeOrmUnitOfWork).
 */
export interface UnitOfWorkPort {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK_PORT = Symbol("UNIT_OF_WORK_PORT");
