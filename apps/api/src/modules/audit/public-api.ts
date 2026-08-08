/**
 * This module's only allowed surface for other modules (07-context-module-
 * map.md: "Each module exposes only... narrow synchronous ports"; lint:arch
 * blocks any other module from importing domain/application/infrastructure
 * here directly). Lives at the module root, not under domain/, so
 * dependency-cruiser's no-cross-module-internals rule doesn't catch it.
 */
export { AuditModule } from "./audit.module";
export { AUDIT_EVENT_REPOSITORY } from "./domain/repositories/audit-event.repository";
export type { AuditEventRepository } from "./domain/repositories/audit-event.repository";
export { AuditEvent } from "./domain/entities/audit-event.entity";
export type { AuditAction } from "./domain/entities/audit-event.entity";
