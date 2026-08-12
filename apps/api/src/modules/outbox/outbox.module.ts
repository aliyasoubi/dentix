import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OUTBOX_EVENT_REPOSITORY } from "./domain/repositories/outbox-event.repository";
import { OutboxEventOrmEntity } from "./infrastructure/persistence/outbox-event.orm-entity";
import { TypeOrmOutboxEventRepository } from "./infrastructure/persistence/outbox-event.typeorm-repository";

/**
 * 07-context-module-map.md: "the shared transaction infrastructure that
 * appends outbox_event and audit_event through their defined ports" — same
 * shape as AuditModule. A consuming module imports OutboxModule and
 * injects OUTBOX_EVENT_REPOSITORY; it never reaches into this module's
 * domain/infrastructure directly (lint:arch's no-cross-module-internals
 * rule blocks that regardless).
 */
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEventOrmEntity])],
  providers: [{ provide: OUTBOX_EVENT_REPOSITORY, useClass: TypeOrmOutboxEventRepository }],
  exports: [OUTBOX_EVENT_REPOSITORY],
})
export class OutboxModule {}
