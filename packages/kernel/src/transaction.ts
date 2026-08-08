/**
 * Opaque handle for "these writes must land in the same database
 * transaction." Domain repository ports accept it so a use case can
 * enlist several repositories in one transaction (03-module-boundaries.md:
 * "one use case = one transaction + outbox/audit writes") without domain/
 * or application/ knowing anything about TypeORM's EntityManager — only
 * the infrastructure/ repository implementations that construct and
 * unwrap it know what's actually inside.
 */
export interface TransactionContext {
  readonly _brand: "TransactionContext";
}
