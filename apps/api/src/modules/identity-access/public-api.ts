/**
 * This module's allowed surface for other modules (07-context-module-
 * map.md: "patients may call identity-access authorization port"; lint:
 * arch's no-cross-module-internals blocks reaching into domain/
 * application/infrastructure directly, same as modules/audit/public-api).
 */
export { IdentityAccessModule } from "./identity-access.module";
export { SessionGuard } from "./presentation/guards/session.guard";
export { CsrfGuard } from "./presentation/guards/csrf.guard";
export { CurrentSession } from "./presentation/decorators/current-session.decorator";
export { UserSession } from "./domain/entities/user-session.entity";
