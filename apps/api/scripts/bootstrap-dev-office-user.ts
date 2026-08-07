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
  const existingMembership = await officeUserRepo.findOne({ where: { userId: account.id } });
  if (!existingMembership) {
    const now = new Date();
    await officeUserRepo.insert({
      id: randomUUID(),
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
    console.log(`Linked office_user membership: ${account.id} -> office ${office.id}`);
  } else {
    console.log(`office_user membership already exists (${existingMembership.id})`);
  }

  await dataSource.destroy();
  console.log("Done. This identity can now complete /auth/login.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
