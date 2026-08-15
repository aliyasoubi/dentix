/**
 * Dev-only (S3-5): links a Keycloak identity to a real office_user row so
 * the login flow has an active user_account + office membership to map
 * to. A real "admin invites/links a user" use case is a later slice
 * (office-user.repository.ts's own comment already says as much) — this
 * script exists so the walking skeleton's login can be exercised end to
 * end before that admin flow is built.
 *
 * Usage:
 *   npx ts-node -T scripts/bootstrap-dev-office-user.ts <keycloak-user-id>
 *
 * <keycloak-user-id> is the id keycloak/seed-dev-user.sh printed — that's
 * the OIDC `sub` claim this script links against.
 */
import "reflect-metadata";
import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import dataSource from "../src/persistence/data-source";
import { Office } from "../src/modules/office-administration/domain/entities/office.entity";
import { OfficeOrmEntity } from "../src/modules/office-administration/infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "../src/modules/office-administration/infrastructure/persistence/office.typeorm-repository";
import { UserAccount } from "../src/modules/identity-access/domain/entities/user-account.entity";
import { UserAccountOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/user-account.orm-entity";
import { TypeOrmUserAccountRepository } from "../src/modules/identity-access/infrastructure/persistence/user-account.typeorm-repository";
import { OfficeUserOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import { RoleOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/role.orm-entity";
import { TypeOrmRoleRepository } from "../src/modules/identity-access/infrastructure/persistence/role.typeorm-repository";
import { PermissionOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/permission.orm-entity";
import { TypeOrmPermissionRepository } from "../src/modules/identity-access/infrastructure/persistence/permission.typeorm-repository";
import { RolePermissionOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/role-permission.orm-entity";
import { TypeOrmRolePermissionRepository } from "../src/modules/identity-access/infrastructure/persistence/role-permission.typeorm-repository";
import { UserRoleOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/user-role.orm-entity";
import { TypeOrmUserRoleRepository } from "../src/modules/identity-access/infrastructure/persistence/user-role.typeorm-repository";
import { SeedDefaultRolesUseCase } from "../src/modules/identity-access/application/use-cases/seed-default-roles.use-case";

const OFFICE_MANAGER_ROLE_CODE = "office_manager";

const DEV_OFFICE_CODE = "main";
const DEV_ISSUER = process.env.OIDC_ISSUER_URL ?? "http://localhost:8080/realms/dentix";

async function main() {
  const keycloakUserId = process.argv[2];
  if (!keycloakUserId) {
    console.error("Usage: ts-node scripts/bootstrap-dev-office-user.ts <keycloak-user-id>");
    process.exit(1);
  }

  await dataSource.initialize();

  const officeRepo = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
  let office = await officeRepo.findByCode(DEV_OFFICE_CODE);
  if (!office) {
    office = Office.create({ id: asUuid(randomUUID()), code: DEV_OFFICE_CODE, timezone: "Asia/Tehran" });
    await officeRepo.create(office);
    console.log(`Created office '${DEV_OFFICE_CODE}' (${office.id})`);
  } else {
    console.log(`Office '${DEV_OFFICE_CODE}' already exists (${office.id})`);
  }

  const userAccountRepo = new TypeOrmUserAccountRepository(dataSource.getRepository(UserAccountOrmEntity));
  let account = await userAccountRepo.findByExternalIdentity(DEV_ISSUER, keycloakUserId);
  if (!account) {
    account = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: keycloakUserId,
      issuer: DEV_ISSUER,
      displayName: "Dev Dentist",
    });
    await userAccountRepo.create(account);
    console.log(`Created user_account for ${DEV_ISSUER}/${keycloakUserId} (${account.id})`);
  } else {
    console.log(`user_account already exists (${account.id})`);
  }

  const officeUserRepo = dataSource.getRepository(OfficeUserOrmEntity);
  let membership = await officeUserRepo.findOne({ where: { userId: account.id } });
  if (!membership) {
    const now = new Date();
    const id = randomUUID();
    await officeUserRepo.insert({
      id,
      officeId: office.id,
      userId: account.id,
      permissionVersion: 1,
      isActive: true,
      createdAt: now,
      createdBy: null,
      updatedAt: now,
      updatedBy: null,
      archivedAt: null,
      archivedBy: null,
    });
    membership = await officeUserRepo.findOneOrFail({ where: { id } });
    console.log(`Linked office_user membership: ${account.id} -> office ${office.id}`);
  } else {
    console.log(`office_user membership already exists (${membership.id})`);
  }

  // The bootstrapped identity needs to be able to add further users too —
  // granting the office_manager role (user.manage, among others) is the
  // real-permission-system equivalent of the old isOfficeAdmin flag this
  // script used to set directly. Roles are seeded per office by
  // SeedDefaultRolesUseCase (also what the CreateRolePermissions/
  // SeedDefaultRoles migrations run for offices that existed at migration
  // time); seed on demand here so this script works against a freshly
  // created office too, not just 'main'.
  const roleRepo = new TypeOrmRoleRepository(dataSource.getRepository(RoleOrmEntity));
  let officeManagerRole = await roleRepo.findByOfficeIdAndCode(office.id, OFFICE_MANAGER_ROLE_CODE);
  if (!officeManagerRole) {
    const seedDefaultRoles = new SeedDefaultRolesUseCase(
      roleRepo,
      new TypeOrmPermissionRepository(dataSource.getRepository(PermissionOrmEntity)),
      new TypeOrmRolePermissionRepository(dataSource.getRepository(RolePermissionOrmEntity)),
    );
    await seedDefaultRoles.execute({ officeId: office.id });
    officeManagerRole = await roleRepo.findByOfficeIdAndCode(office.id, OFFICE_MANAGER_ROLE_CODE);
    console.log(`Seeded default roles for office ${office.id}`);
  }
  if (!officeManagerRole) {
    throw new Error(`office_manager role not found for office ${office.id} after seeding`);
  }

  const userRoleRepo = new TypeOrmUserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
  const existingRoleIds = await userRoleRepo.findRoleIdsByOfficeUserId(asUuid(membership.id));
  if (!existingRoleIds.includes(officeManagerRole.id)) {
    await userRoleRepo.grant(asUuid(membership.id), officeManagerRole.id, null);
    console.log(`Granted role '${OFFICE_MANAGER_ROLE_CODE}' to office_user ${membership.id}`);
  } else {
    console.log(`office_user ${membership.id} already has role '${OFFICE_MANAGER_ROLE_CODE}'`);
  }

  await dataSource.destroy();
  console.log("Done. This identity can now complete /auth/login.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
