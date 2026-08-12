/**
 * This module's only allowed surface for other modules (07-context-module-
 * map.md; lint:arch blocks any other module from importing domain/
 * application/infrastructure here directly). Lives at the module root, not
 * under domain/, so dependency-cruiser's no-cross-module-internals rule
 * doesn't catch it.
 */
export { OutboxModule } from "./outbox.module";
export { OUTBOX_EVENT_REPOSITORY } from "./domain/repositories/outbox-event.repository";
export type { OutboxEventRepository } from "./domain/repositories/outbox-event.repository";
export { OutboxEvent } from "./domain/entities/outbox-event.entity";
export type { OutboxEventProps } from "./domain/entities/outbox-event.entity";
