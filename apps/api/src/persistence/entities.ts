import { OfficeOrmEntity } from "../modules/office-administration/infrastructure/persistence/office.orm-entity";

/**
 * The single explicit registry of every ORM entity in the app (ADR-006,
 * point 1: "no glob-based entity auto-loading — each module's
 * infrastructure layer exports its entity list; the data source composes
 * them"). `lint:arch` fails CI if an `*.orm-entity.ts` file exists on disk
 * that isn't listed here.
 */
export const APP_ENTITIES = [OfficeOrmEntity] as const;
