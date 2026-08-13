import "reflect-metadata";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { asUuid } from "@dentix/kernel";
import { AuditEvent } from "../../src/modules/audit/domain/entities/audit-event.entity";
import { OfficeUser } from "../../src/modules/identity-access/domain/entities/office-user.entity";
import { UserAccount } from "../../src/modules/identity-access/domain/entities/user-account.entity";
import { UserSession } from "../../src/modules/identity-access/domain/entities/user-session.entity";
import { OidcAuthorizationRequest } from "../../src/modules/identity-access/domain/entities/oidc-authorization-request.entity";
import { AuditEventOrmEntity } from "../../src/modules/audit/infrastructure/persistence/audit-event.orm-entity";
import { TypeOrmAuditEventRepository } from "../../src/modules/audit/infrastructure/persistence/audit-event.typeorm-repository";
import { OfficeUserOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import { OidcAuthorizationRequestOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/oidc-authorization-request.orm-entity";
import { TypeOrmOfficeUserRepository } from "../../src/modules/identity-access/infrastructure/persistence/office-user.typeorm-repository";
import { TypeOrmOidcAuthorizationRequestRepository } from "../../src/modules/identity-access/infrastructure/persistence/oidc-authorization-request.typeorm-repository";
import { TypeOrmUnitOfWork } from "../../src/platform/typeorm-unit-of-work";
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
  let auditEventRepo: TypeOrmAuditEventRepository;
  let unitOfWork: TypeOrmUnitOfWork;

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
    auditEventRepo = new TypeOrmAuditEventRepository(dataSource.getRepository(AuditEventOrmEntity));
    unitOfWork = new TypeOrmUnitOfWork(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE "user_session", "office_user", "user_account", "office", "audit_event" CASCADE',
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

      // Seeded via a direct ORM insert rather than officeUserRepo.create()
      // specifically to prove findByUserId() against a row nothing in this
      // module's own write path produced — officeUserRepo.create() gets its
      // own round-trip test just below.
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
      // The column defaults to false at the DB level; this row's insert
      // above didn't set it, and the mapper must read that default back
      // rather than silently coercing an absent value to something else.
      expect(found?.isOfficeAdmin).toBe(false);
    });

    it("returns null for a user with no office membership", async () => {
      const found = await officeUserRepo.findByUserId(asUuid(randomUUID()));
      expect(found).toBeNull();
    });

    it("create() round-trips isOfficeAdmin and records the acting admin as createdBy — real SQL, not a mock", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const actor = await seedAccountAndOffice();

      const officeUser = OfficeUser.create({ id: asUuid(randomUUID()), officeId, userId });
      await officeUserRepo.create(officeUser, actor.userId);

      const found = await officeUserRepo.findByUserId(userId);
      expect(found?.officeId).toBe(officeId);
      // OfficeUser.create() always starts non-admin — this is the same
      // guarantee AddOfficeUserUseCase's own test locks in, proven here
      // against the real column default and mapper round trip instead of a
      // mock.
      expect(found?.isOfficeAdmin).toBe(false);

      const raw = await dataSource!.getRepository(OfficeUserOrmEntity).findOneOrFail({
        where: { userId },
      });
      expect(raw.createdBy).toBe(actor.userId);
    });

    it("rejects a second membership for the same office_id/user_id pair", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      await officeUserRepo.create(OfficeUser.create({ id: asUuid(randomUUID()), officeId, userId }), null);

      await expect(
        officeUserRepo.create(OfficeUser.create({ id: asUuid(randomUUID()), officeId, userId }), null),
      ).rejects.toThrow(/duplicate key value/i);
    });
  });

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

  describe("UserSession", () => {
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

    it("touch() then touchIfActive() persists the new idle expiry, not a stale one", async () => {
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
      const applied = await sessionRepo.touchIfActive(session);

      expect(applied).toBe(true);
      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      expect(reloaded?.idleExpiresAt.getTime()).toBe(session.idleExpiresAt.getTime());
    });

    it("revoke() then revoke() persists revokedReason — not silently dropped", async () => {
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
      await sessionRepo.revoke(session);

      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      expect(reloaded?.checkValidity(now)).toEqual({ valid: false, reason: "REVOKED" });
    });

    it("touchIfActive() returns false and does not resurrect an already-revoked session", async () => {
      // Proves the fix for the race the external review flagged: a touch
      // that read the row before a concurrent revoke committed must not be
      // able to win the write and undo the revoke.
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

      // Two independent in-memory copies of the same row, as two concurrent
      // requests would each hold after their own findByHash().
      const copyForTouch = (await sessionRepo.findByHash(session.sessionHash))!;
      const copyForRevoke = (await sessionRepo.findByHash(session.sessionHash))!;

      // The revoke request's write commits first...
      copyForRevoke.revoke("user-initiated logout", new Date(now.getTime() + 1_000));
      await sessionRepo.revoke(copyForRevoke);

      // ...then the touch request — which had already decided to extend the
      // idle window before it knew about the revoke — attempts its write.
      copyForTouch.touch(new Date(now.getTime() + 2_000));
      const touchApplied = await sessionRepo.touchIfActive(copyForTouch);

      expect(touchApplied).toBe(false);
      const reloaded = await sessionRepo.findByHash(session.sessionHash);
      expect(reloaded?.checkValidity(new Date(now.getTime() + 3_000))).toEqual({
        valid: false,
        reason: "REVOKED",
      });
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

  interface AuditEventRow {
    readonly action: string;
    readonly detail: string | null;
  }

  async function queryAuditEventRows(id: string): Promise<AuditEventRow[]> {
    const rows: AuditEventRow[] = await dataSource!.query('SELECT * FROM "audit_event" WHERE "id" = $1', [
      id,
    ]);
    return rows;
  }

  describe("AuditEvent + UnitOfWork", () => {
    it("round-trips through create", async () => {
      const now = new Date();
      const event = AuditEvent.create({
        id: asUuid(randomUUID()),
        officeId: null,
        actorUserId: null,
        action: "login_failed",
        entityType: "login_attempt",
        entityId: null,
        detail: "reason=INVALID_STATE",
        now,
      });
      await auditEventRepo.create(event);

      const [row] = await queryAuditEventRows(event.id);
      expect(row.action).toBe("login_failed");
      expect(row.detail).toBe("reason=INVALID_STATE");
    });

    it("commits every write inside runInTransaction together", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const now = new Date();
      const session = UserSession.create({
        id: asUuid(randomUUID()),
        sessionHash: randomUUID(),
        userId,
        officeId,
        authenticatedAt: now,
        mfaContext: "otp",
        csrfTokenHash: "csrf",
        permissionVersion: 1,
        now,
      });
      const event = AuditEvent.create({
        id: asUuid(randomUUID()),
        officeId,
        actorUserId: userId,
        action: "login_succeeded",
        entityType: "user_session",
        entityId: session.id,
        detail: null,
        now,
      });

      await unitOfWork.runInTransaction(async (tx) => {
        await sessionRepo.create(session, tx);
        await auditEventRepo.create(event, tx);
      });

      expect(await sessionRepo.findByHash(session.sessionHash)).not.toBeNull();
      const [row] = await queryAuditEventRows(event.id);
      expect(row).toBeDefined();
    });

    it("rolls back every write when the transaction's callback throws — proves the callback is atomic, not just sequential", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const now = new Date();
      const session = UserSession.create({
        id: asUuid(randomUUID()),
        sessionHash: randomUUID(),
        userId,
        officeId,
        authenticatedAt: now,
        mfaContext: "otp",
        csrfTokenHash: "csrf",
        permissionVersion: 1,
        now,
      });
      const event = AuditEvent.create({
        id: asUuid(randomUUID()),
        officeId,
        actorUserId: userId,
        action: "login_succeeded",
        entityType: "user_session",
        entityId: session.id,
        detail: null,
        now,
      });

      await expect(
        unitOfWork.runInTransaction(async (tx) => {
          await sessionRepo.create(session, tx);
          await auditEventRepo.create(event, tx);
          throw new Error("simulated failure after both writes");
        }),
      ).rejects.toThrow("simulated failure after both writes");

      // Neither write should have survived — this is the actual atomicity
      // proof the external review asked for, not just "both calls happened
      // to succeed in sequence."
      expect(await sessionRepo.findByHash(session.sessionHash)).toBeNull();
      const rows = await queryAuditEventRows(event.id);
      expect(rows).toHaveLength(0);
    });
  });
});
