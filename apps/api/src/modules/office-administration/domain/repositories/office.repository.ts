import { Uuid } from "@dentix/kernel";
import { Office } from "../entities/office.entity";

/**
 * Port. Implemented in infrastructure/persistence; nothing in domain/ or
 * application/ may import the implementation directly (03-module-boundaries.md).
 */
export interface OfficeRepository {
  findById(id: Uuid): Promise<Office | null>;
  findByCode(code: string): Promise<Office | null>;
  /**
   * Insert only. There is deliberately no generic `save`/upsert here: a
   * combined method invites exactly the bug a later update path would hit
   * silently (created_at/created_by overwritten on every re-save). An
   * `update` method — preserving created_at/created_by and only advancing
   * updated_at/updated_by/version — gets added when a real update use case
   * exists, not before.
   */
  create(office: Office): Promise<void>;
}

export const OFFICE_REPOSITORY = Symbol("OFFICE_REPOSITORY");
