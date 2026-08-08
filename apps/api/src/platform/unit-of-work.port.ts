import { TransactionContext } from "@dentix/kernel";

/**
 * Shared platform port (not owned by any one bounded-context module) over
 * a single-transaction unit of work (03-module-boundaries.md: "one use
 * case = one transaction + outbox/audit writes"). Every module that needs
 * to enlist its own writes and a call to the shared `audit` module's
 * repository in one transaction provides this port locally with
 * `useClass: TypeOrmUnitOfWork` — the port and the concrete class are
 * shared, the DI binding stays per-module. A use case only ever sees the
 * opaque TransactionContext handed to repository calls inside `work` —
 * the concrete EntityManager it wraps is TypeOrmUnitOfWork's own detail.
 */
export interface UnitOfWorkPort {
  runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK_PORT = Symbol("UNIT_OF_WORK_PORT");
