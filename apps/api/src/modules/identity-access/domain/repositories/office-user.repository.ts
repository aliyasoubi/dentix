import { Uuid } from "@dentix/kernel";
import { OfficeUser } from "../entities/office-user.entity";

export interface OfficeUserRepository {
  /** Single-office deployment (system-architecture.md): one row expected. */
  findByUserId(userId: Uuid): Promise<OfficeUser | null>;
}

export const OFFICE_USER_REPOSITORY = Symbol("OFFICE_USER_REPOSITORY");
