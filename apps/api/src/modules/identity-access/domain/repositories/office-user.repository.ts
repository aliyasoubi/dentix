import { TransactionContext, Uuid } from "@dentix/kernel";
import { OfficeUser } from "../entities/office-user.entity";

export interface OfficeUserRepository {
  /** Single-office deployment (system-architecture.md): one row expected. */
  findByUserId(userId: Uuid): Promise<OfficeUser | null>;
  /** Insert only, same reasoning as OfficeRepository.create — no update/upsert until a real update use case needs one. */
  create(officeUser: OfficeUser, createdBy: Uuid | null, tx?: TransactionContext): Promise<void>;
}

export const OFFICE_USER_REPOSITORY = Symbol("OFFICE_USER_REPOSITORY");
