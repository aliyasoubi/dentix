import { Uuid } from "@dentix/kernel";
import { Office } from "../entities/office.entity";

/**
 * Port. Implemented in infrastructure/persistence; nothing in domain/ or
 * application/ may import the implementation directly (03-module-boundaries.md).
 */
export interface OfficeRepository {
  findById(id: Uuid): Promise<Office | null>;
  findByCode(code: string): Promise<Office | null>;
  save(office: Office): Promise<void>;
}

export const OFFICE_REPOSITORY = Symbol("OFFICE_REPOSITORY");
