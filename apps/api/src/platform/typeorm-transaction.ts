import { EntityManager, ObjectLiteral, Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";

/**
 * The only place that knows a TransactionContext is actually "a TypeORM
 * EntityManager wearing a domain-facing costume" (03-module-boundaries.md
 * — domain/application never see this, only infrastructure/ repositories).
 */
export interface TypeOrmTransactionContext extends TransactionContext {
  readonly manager: EntityManager;
}

/**
 * Returns a repository scoped to the transaction's EntityManager when one
 * was supplied, otherwise the module's normal (auto-committing) repository
 * — so every repository method takes an optional `tx` with one line, not a
 * branch at every call site.
 */
export function repositoryFor<T extends ObjectLiteral>(
  defaultRepository: Repository<T>,
  tx: TransactionContext | undefined,
): Repository<T> {
  if (!tx) {
    return defaultRepository;
  }
  return (tx as TypeOrmTransactionContext).manager.getRepository(defaultRepository.target);
}

/** Same idea as repositoryFor, for repositories that need the raw EntityManager (e.g. a hand-written UPSERT) rather than a typed Repository<T>. */
export function managerFor(defaultManager: EntityManager, tx: TransactionContext | undefined): EntityManager {
  return tx ? (tx as TypeOrmTransactionContext).manager : defaultManager;
}
