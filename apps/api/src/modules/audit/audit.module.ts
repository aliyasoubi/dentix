import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AUDIT_EVENT_REPOSITORY } from "./domain/repositories/audit-event.repository";
import { AuditEventOrmEntity } from "./infrastructure/persistence/audit-event.orm-entity";
import { TypeOrmAuditEventRepository } from "./infrastructure/persistence/audit-event.typeorm-repository";

/**
 * 07-context-module-map.md: "Audit | `audit` | Append-only security and
 * business audit events... | Mutation of source-domain records" — the one
 * table every other module is explicitly allowed to write to, through
 * this module's own port, per that doc's data-ownership rule 2 ("except
 * the shared transaction infrastructure that appends outbox_event and
 * audit_event through their defined ports"). A consuming module imports
 * AuditModule and injects AUDIT_EVENT_REPOSITORY — it never reaches into
 * this module's domain/infrastructure directly (lint:arch's
 * no-cross-module-internals rule blocks that regardless).
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditEventOrmEntity])],
  providers: [{ provide: AUDIT_EVENT_REPOSITORY, useClass: TypeOrmAuditEventRepository }],
  exports: [AUDIT_EVENT_REPOSITORY],
})
export class AuditModule {}
