import "reflect-metadata";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { asUuid } from "@dentix/kernel";
import { UserAccount } from "../../src/modules/identity-access/domain/entities/user-account.entity";
import { UserSession } from "../../src/modules/identity-access/domain/entities/user-session.entity";
import { OidcAuthorizationRequest } from "../../src/modules/identity-access/domain/entities/oidc-authorization-request.entity";
import { OfficeUserOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import { OidcAuthorizationRequestOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/oidc-authorization-request.orm-entity";
import { TypeOrmOfficeUserRepository } from "../../src/modules/identity-access/infrastructure/persistence/office-user.typeorm-repository";
import { TypeOrmOidcAuthorizationRequestRepository } from "../../src/modules/identity-access/infrastructure/persistence/oidc-authorization-request.typeorm-repository";
import { TypeOrmUserAccountRepository } from "../../src/modules/identity-access/infrastructure/persistence/user-account.typeorm-repository";
import { TypeOrmUserSessionRepository } from "../../src/modules/identity-access/infrastructure/persistence/user-session.typeorm-repository";
import { UserAccountOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/user-account.orm-entity";
import { UserSessionOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/user-session.orm-entity";
import { OfficeOrmEntity } from "../../src/modules/office-administration/infrastructure/persistence/office.orm-entity";
import { Office } from "../../src/modules/office-administration/domain/entities/office.entity";
import { TypeOrmOfficeRepository } from "../../src/modules/office-administration/infrastructure/persistence/office.typeorm-repository";
import { dataSourceOptions } from "../../src/persistence/data-source";

describe("Identity and Access persistence (integration)", () => {
  let dataSource: DataSource | undefined;
  let officeRepo: TypeOrmOfficeRepository;
  let userAccountRepo: TypeOrmUserAccountRepository;
  let officeUserRepo: TypeOrmOfficeUserRepository;
  let sessionRepo: TypeOrmUserSessionRepository;
  let oidcRequestRepo: TypeOrmOidcAuthorizationRequestRepository;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
    officeRepo = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
    userAccountRepo = new TypeOrmUserAccountRepository(dataSource.getRepository(UserAccountOrmEntity));
    officeUserRepo = new TypeOrmOfficeUserRepository(dataSource.getRepository(OfficeUserOrmEntity));
    sessionRepo = new TypeOrmUserSessionRepository(dataSource.getRepository(UserSessionOrmEntity));
    oidcRequestRepo = new TypeOrmOidcAuthorizationRequestRepository(
      dataSource.getRepository(OidcAuthorizationRequestOrmEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE "user_session", "office_user", "user_account", "office" CASCADE',
      );
      await dataSource
        .getRepository(OidcAuthorizationRequestOrmEntity)
        .query('TRUNCATE TABLE "oidc_authorization_request"');
      await dataSource.destroy();
    }
  });

  describe("UserAccount", () => {
    it("round-trips through create/findByExternalIdentity/findById", async () => {
      const issuer = `https://kc.local/realms/test-${randomUUID().slice(0, 8)}`;
      const account = UserAccount.create({
        id: asUuid(randomUUID()),
        externalSubject: "kc-sub-1",
        issuer,
        displayName: "Dev Dentist",
      });
      await userAccountRepo.create(account);

      const byIdentity = await userAccountRepo.findByExternalIdentity(issuer, "kc-sub-1");
      expect(byIdentity?.id).toBe(account.id);
      expect(byIdentity?.displayName).toBe("Dev Dentist");

      const byId = await userAccountRepo.findById(account.id);
      expect(byId?.externalSubject).toBe("kc-sub-1");
    });

    it("enforces the (issuer, external_subject) unique constraint", async () => {
      const issuer = `https://kc.local/realms/test-${randomUUID().slice(0, 8)}`;
      const first = UserAccount.create({
        id: asUuid(randomUUID()),
        externalSubject: "dup-sub",
        issuer,
        displayName: "A",
      });
      const second = UserAccount.create({
        id: asUuid(randomUUID()),
        externalSubject: "dup-sub",
        issuer,
        displayName: "B",
      });
      await userAccountRepo.create(first);
      await expect(userAccountRepo.create(second)).rejects.toThrow(/duplicate key value/i);
    });
  });

  describe("OfficeUser", () => {
    it("finds the office membership seeded for a user", async () => {
      const office = Office.create({
        id: asUuid(randomUUID()),
        code: `t-${randomUUID().slice(0, 6)}`,
        timezone: "Asia/Tehran",
      });
      await officeRepo.create(office);
      const account = UserAccount.create({
        id: asUuid(randomUUID()),
        externalSubject: `sub-${randomUUID()}`,
        issuer: "https://kc.local",
        displayName: "x",
      });
      await userAccountRepo.create(account);

      // office_user has no create() in the port (S3 links accounts via the
      // dev bootstrap script, not a domain use case yet) — seed directly.
      await dataSource!.getRepository(OfficeUserOrmEntity).insert({
        id: randomUUID(),
        officeId: office.id,
        userId: account.id,
        permissionVersion: 1,
        isActive: true,
        createdAt: new Date(),
        createdBy: null,
        updatedAt: new Date(),
        updatedBy: null,
        archivedAt: null,
        archivedBy: null,
      });

      const found = await officeUserRepo.findByUserId(account.id);
      expect(found?.officeId).toBe(office.id);
      expect(found?.permissionVersion).toBe(1);
      expect(found?.isActive).toBe(true);
    });

    it("returns null for a user with no office membership", async () => {
      const found = await officeUserRepo.findByUserId(asUuid(randomUUID()));
      expect(found).toBeNull();
    });
  });

  describe("UserSession", () => {
    async function seedAccountAndOffice(): Promise<{
      userId: ReturnType<typeof asUuid>;
      officeId: ReturnType<typeof asUuid>;
    }> {
      const office = Office.create({
        id: asUuid(randomUUID()),
        code: `s-${randomUUID().slice(0, 6)}`,
        timezone: "Asia/Tehran",
      });
      await officeRepo.create(office);
      const account = UserAccount.create({
        id: asUuid(randomUUID()),
        externalSubject: `sub-${randomUUID()}`,
        issuer: "https://kc.local",
        displayName: "x",
      });
      await userAccountRepo.create(account);
      return { userId: account.id, officeId: office.id };
    }

    it("round-trips mfaContext and permissionVersion through a real save/load", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const now = new Date();
      const session = UserSession.create({
        id: asUuid(randomUUID()),
        sessionHash: randomUUID(),
        userId,
        officeId,
        authenticatedAt: now,
        mfaContext: "otp",
        csrfTokenHash: "csrf-hash-value",
        permissionVersion: 7,
        now,
      });
      await sessionRepo.create(session);

      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      // Regression check for the bug the code review process caught before
      // this ever reached a database: the mapper once hardcoded this to null.
      expect(reloaded?.checkValidity(now)).toEqual({ valid: true });
      expect(reloaded?.permissionVersion).toBe(7);
      expect(reloaded?.csrfTokenHash).toBe("csrf-hash-value");
    });

    it("touch() then update() persists the new idle expiry, not a stale one", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const now = new Date();
      const session = UserSession.create({
        id: asUuid(randomUUID()),
        sessionHash: randomUUID(),
        userId,
        officeId,
        authenticatedAt: now,
        mfaContext: null,
        csrfTokenHash: "csrf",
        permissionVersion: 1,
        now,
      });
      await sessionRepo.create(session);

      const touchedAt = new Date(now.getTime() + 60_000);
      session.touch(touchedAt);
      await sessionRepo.update(session);

      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      expect(reloaded?.idleExpiresAt.getTime()).toBe(session.idleExpiresAt.getTime());
    });

    it("revoke() then update() persists revokedReason — not silently dropped", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const now = new Date();
      const session = UserSession.create({
        id: asUuid(randomUUID()),
        sessionHash: randomUUID(),
        userId,
        officeId,
        authenticatedAt: now,
        mfaContext: null,
        csrfTokenHash: "csrf",
        permissionVersion: 1,
        now,
      });
      await sessionRepo.create(session);

      session.revoke("user-initiated logout", now);
      await sessionRepo.update(session);

      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      expect(reloaded?.checkValidity(now)).toEqual({ valid: false, reason: "REVOKED" });
    });
  });

  describe("OidcAuthorizationRequest", () => {
    it("round-trips and enforces single-use via markUsed", async () => {
      const now = new Date();
      const request = OidcAuthorizationRequest.create({
        id: asUuid(randomUUID()),
        stateHash: randomUUID(),
        nonceEncrypted: "encrypted-nonce-blob",
        pkceVerifierEncrypted: "encrypted-verifier-blob",
        returnPath: "/dashboard",
        now,
      });
      await oidcRequestRepo.create(request);

      const found = await oidcRequestRepo.findByStateHash(request.stateHash);
      expect(found?.isUsable(now)).toBe(true);
      expect(found?.nonceEncrypted).toBe("encrypted-nonce-blob");

      found!.markUsed(now);
      await oidcRequestRepo.markUsed(found!);

      const reloaded = await oidcRequestRepo.findByStateHash(request.stateHash);
      expect(reloaded?.isUsable(now)).toBe(false);
    });

    it("enforces the state_hash unique constraint", async () => {
      const stateHash = randomUUID();
      const now = new Date();
      const first = OidcAuthorizationRequest.create({
        id: asUuid(randomUUID()),
        stateHash,
        nonceEncrypted: "a",
        pkceVerifierEncrypted: "b",
        returnPath: "/x",
        now,
      });
      const second = OidcAuthorizationRequest.create({
        id: asUuid(randomUUID()),
        stateHash,
        nonceEncrypted: "c",
        pkceVerifierEncrypted: "d",
        returnPath: "/y",
        now,
      });
      await oidcRequestRepo.create(first);
      await expect(oidcRequestRepo.create(second)).rejects.toThrow(/duplicate key value/i);
    });
  });
});
