import { Uuid } from "@dentix/kernel";
import { PermissionCode } from "../value-objects/permission-code";

/** No `create`/`update`: permission rows are application-owned and seeded once by migration — see permission.orm-entity.ts. */
export interface PermissionRecord {
  readonly id: Uuid;
  readonly code: PermissionCode;
}

export interface PermissionRepository {
  findByCode(code: PermissionCode): Promise<PermissionRecord | null>;
  findByCodes(codes: readonly PermissionCode[]): Promise<readonly PermissionRecord[]>;
  findAll(): Promise<readonly PermissionRecord[]>;
}

export const PERMISSION_REPOSITORY = Symbol("PERMISSION_REPOSITORY");
