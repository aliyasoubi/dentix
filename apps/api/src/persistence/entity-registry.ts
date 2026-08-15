import { OfficeOrmEntity } from "../modules/office-administration/infrastructure/persistence/office.orm-entity";
import { AuditEventOrmEntity } from "../modules/audit/infrastructure/persistence/audit-event.orm-entity";
import { OutboxEventOrmEntity } from "../modules/outbox/infrastructure/persistence/outbox-event.orm-entity";
import { OfficeUserOrmEntity } from "../modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import { OidcAuthorizationRequestOrmEntity } from "../modules/identity-access/infrastructure/persistence/oidc-authorization-request.orm-entity";
import { PermissionOrmEntity } from "../modules/identity-access/infrastructure/persistence/permission.orm-entity";
import { RoleOrmEntity } from "../modules/identity-access/infrastructure/persistence/role.orm-entity";
import { RolePermissionOrmEntity } from "../modules/identity-access/infrastructure/persistence/role-permission.orm-entity";
import { UserAccountOrmEntity } from "../modules/identity-access/infrastructure/persistence/user-account.orm-entity";
import { UserPermissionExceptionOrmEntity } from "../modules/identity-access/infrastructure/persistence/user-permission-exception.orm-entity";
import { UserRoleOrmEntity } from "../modules/identity-access/infrastructure/persistence/user-role.orm-entity";
import { UserSessionOrmEntity } from "../modules/identity-access/infrastructure/persistence/user-session.orm-entity";
import { PatientAddressOrmEntity } from "../modules/patients/infrastructure/persistence/patient-address.orm-entity";
import { PatientContactOrmEntity } from "../modules/patients/infrastructure/persistence/patient-contact.orm-entity";
import { PatientIdentifierOrmEntity } from "../modules/patients/infrastructure/persistence/patient-identifier.orm-entity";
import { PatientNameOrmEntity } from "../modules/patients/infrastructure/persistence/patient-name.orm-entity";
import { PatientOrmEntity } from "../modules/patients/infrastructure/persistence/patient.orm-entity";

/**
 * The single explicit registry of every ORM entity in the app (ADR-006,
 * point 1: "no glob-based entity auto-loading — each module's
 * infrastructure layer exports its entity list; the data source composes
 * them"). `lint:arch` fails CI if an `*.orm-entity.ts` file exists on disk
 * that isn't listed here.
 */
export const APP_ENTITIES = [
  OfficeOrmEntity,
  UserAccountOrmEntity,
  OfficeUserOrmEntity,
  UserSessionOrmEntity,
  OidcAuthorizationRequestOrmEntity,
  RoleOrmEntity,
  PermissionOrmEntity,
  UserRoleOrmEntity,
  RolePermissionOrmEntity,
  UserPermissionExceptionOrmEntity,
  AuditEventOrmEntity,
  OutboxEventOrmEntity,
  PatientOrmEntity,
  PatientNameOrmEntity,
  PatientContactOrmEntity,
  PatientIdentifierOrmEntity,
  PatientAddressOrmEntity,
] as const;
