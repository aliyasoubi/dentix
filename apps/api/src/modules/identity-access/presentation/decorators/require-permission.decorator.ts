import { SetMetadata } from "@nestjs/common";
import { PermissionCode } from "../../domain/value-objects/permission-code";

export const REQUIRE_PERMISSION_KEY = "require-permission";

/** Only meaningful on a route also guarded by SessionGuard and PermissionGuard — see that guard's own comment for the ordering this depends on. */
export const RequirePermission = (code: PermissionCode) => SetMetadata(REQUIRE_PERMISSION_KEY, code);
