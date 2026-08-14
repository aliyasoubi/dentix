import { TransactionContext, Uuid } from "@dentix/kernel";
import { Role } from "../entities/role.entity";

export interface RoleRepository {
  findByOfficeIdAndCode(officeId: Uuid, code: string): Promise<Role | null>;
  findByIds(ids: readonly Uuid[]): Promise<readonly Role[]>;
  create(role: Role, createdBy: Uuid | null, tx?: TransactionContext): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");
