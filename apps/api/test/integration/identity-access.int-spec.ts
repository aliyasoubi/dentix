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
import { PERMISSION_CODES } from "../../src/modules/identity-access/domain/value-objects/permission-code";
import { Role } from "../../src/modules/identity-access/domain/entities/role.entity";
import { UserPermissionException } from "../../src/modules/identity-access/domain/entities/user-permission-exception.entity";
import { PermissionOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/permission.orm-entity";
import { RoleOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/role.orm-entity";
import { RolePermissionOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/role-permission.orm-entity";
import { UserPermissionExceptionOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/user-permission-exception.orm-entity";
import { UserRoleOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/user-role.orm-entity";
import { TypeOrmPermissionRepository } from "../../src/modules/identity-access/infrastructure/persistence/permission.typeorm-repository";
import { TypeOrmRoleRepository } from "../../src/modules/identity-access/infrastructure/persistence/role.typeorm-repository";
import { TypeOrmRolePermissionRepository } from "../../src/modules/identity-access/infrastructure/persistence/role-permission.typeorm-repository";
import { TypeOrmUserPermissionExceptionRepository } from "../../src/modules/identity-access/infrastructure/persistence/user-permission-exception.typeorm-repository";
import { TypeOrmUserRoleRepository } from "../../src/modules/identity-access/infrastructure/persistence/user-role.typeorm-repository";
import { ResolveEffectivePermissionsUseCase } from "../../src/modules/identity-access/application/use-cases/resolve-effective-permissions.use-case";
import { SeedDefaultRolesUseCase } from "../../src/modules/identity-access/application/use-cases/seed-default-roles.use-case";

describe("Identity and Access persistence (integration)", () => {
  let dataSource: DataSource | undefined;
  let officeRepo: TypeOrmOfficeRepository;
  let userAccountRepo: TypeOrmUserAccountRepository;
  let officeUserRepo: TypeOrmOfficeUserRepository;
  let sessionRepo: TypeOrmUserSessionRepository;
  let oidcRequestRepo: TypeOrmOidcAuthorizationRequestRepository;
  let auditEventRepo: TypeOrmAuditEventRepository;
  let unitOfWork: TypeOrmUnitOfWork;
  let roleRepo: TypeOrmRoleRepository;
  let permissionRepo: TypeOrmPermissionRepository;
  let userRoleRepo: TypeOrmUserRoleRepository;
  let rolePermissionRepo: TypeOrmRolePermissionRepository;
  let userPermissionExceptionRepo: TypeOrmUserPermissionExceptionRepository;

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
    roleRepo = new TypeOrmRoleRepository(dataSource.getRepository(RoleOrmEntity));
    permissionRepo = new TypeOrmPermissionRepository(dataSource.getRepository(PermissionOrmEntity));
    userRoleRepo = new TypeOrmUserRoleRepository(dataSource.getRepository(UserRoleOrmEntity));
    rolePermissionRepo = new TypeOrmRolePermissionRepository(
      dataSource.getRepository(RolePermissionOrmEntity),
    );
    userPermissionExceptionRepo = new TypeOrmUserPermissionExceptionRepository(
      dataSource.getRepository(UserPermissionExceptionOrmEntity),
      dataSource.getRepository(PermissionOrmEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        // "permission" deliberately excluded — application-owned, seeded once
        // by migration, never truncated between test runs (see that table's
        // own comment).
        'TRUNCATE TABLE "user_permission_exception", "role_permission", "user_role", "role", "user_session", "office_user", "user_account", "office", "audit_event" CASCADE',
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
    });

    it("returns null for a user with no office membership", async () => {
      const found = await officeUserRepo.findByUserId(asUuid(randomUUID()));
      expect(found).toBeNull();
    });

    it("create() records the acting admin as createdBy — real SQL, not a mock", async () => {
      const { userId, officeId } = await seedAccountAndOffice();
      const actor = await seedAccountAndOffice();

      const officeUser = OfficeUser.create({ id: asUuid(randomUUID()), officeId, userId });
      await officeUserRepo.create(officeUser, actor.userId);

      const found = await officeUserRepo.findByUserId(userId);
      expect(found?.officeId).toBe(officeId);

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

  describe("permission (seed data)", () => {
    it("has exactly the codes PERMISSION_CODES declares — the migration's INSERT and the TS mirror must not drift", async () => {
      const records = await permissionRepo.findAll();
      const seededCodes = records.map((r) => r.code).sort();
      const declaredCodes = [...PERMISSION_CODES].sort();
      expect(seededCodes).toEqual(declaredCodes);
    });

    it("findByCode resolves a known code to its row", async () => {
      const record = await permissionRepo.findByCode("patient.view");
      expect(record?.code).toBe("patient.view");
    });

    it("findByCode returns null for an unknown code", async () => {
      // Cast past the union type deliberately — proving the *runtime* miss
      // behavior for a code that was never seeded, not something the type
      // system would let through in real call sites.
      const record = await permissionRepo.findByCode("not.a.real.code" as never);
      expect(record).toBeNull();
    });
  });

  describe("Role", () => {
    async function seedOffice() {
      const office = Office.create({
        id: asUuid(randomUUID()),
        code: `t-${randomUUID().slice(0, 6)}`,
        timezone: "Asia/Tehran",
      });
      await officeRepo.create(office);
      return office;
    }

    it("round-trips through create/findByOfficeIdAndCode", async () => {
      const office = await seedOffice();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);

      const found = await roleRepo.findByOfficeIdAndCode(office.id, "dentist");
      expect(found?.id).toBe(role.id);
      expect(found?.name).toBe("Dentist");
    });

    it("enforces the (office_id, code) unique constraint", async () => {
      const office = await seedOffice();
      const first = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      const second = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist 2",
      });
      await roleRepo.create(first, null);
      await expect(roleRepo.create(second, null)).rejects.toThrow(/duplicate key value/i);
    });

    it("the same role code is fine in two different offices — the constraint is per-office", async () => {
      const officeA = await seedOffice();
      const officeB = await seedOffice();
      await roleRepo.create(
        Role.create({ id: asUuid(randomUUID()), officeId: officeA.id, code: "dentist", name: "Dentist" }),
        null,
      );
      await expect(
        roleRepo.create(
          Role.create({ id: asUuid(randomUUID()), officeId: officeB.id, code: "dentist", name: "Dentist" }),
          null,
        ),
      ).resolves.not.toThrow();
    });

    it("findByIds returns every requested role and nothing else", async () => {
      const office = await seedOffice();
      const dentist = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      const cashier = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "cashier",
        name: "Cashier",
      });
      const unrelated = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "manager",
        name: "Manager",
      });
      await roleRepo.create(dentist, null);
      await roleRepo.create(cashier, null);
      await roleRepo.create(unrelated, null);

      const found = await roleRepo.findByIds([dentist.id, cashier.id]);
      expect(found.map((r) => r.id).sort()).toEqual([dentist.id, cashier.id].sort());
    });
  });

  describe("user_role / role_permission links", () => {
    async function seedOfficeUser() {
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
        displayName: "Test User",
      });
      await userAccountRepo.create(account);
      const officeUser = OfficeUser.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        userId: account.id,
      });
      await officeUserRepo.create(officeUser, null);
      return { office, officeUser };
    }

    it("grants a role to an office_user and finds it back by role id", async () => {
      const { office, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);

      await userRoleRepo.grant(officeUser.id, role.id, null);

      const roleIds = await userRoleRepo.findRoleIdsByOfficeUserId(officeUser.id);
      expect(roleIds).toEqual([role.id]);
    });

    it("revoke deletes the link — a real delete, not a soft-delete (see the migration's own comment on why)", async () => {
      const { office, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);
      await userRoleRepo.grant(officeUser.id, role.id, null);

      await userRoleRepo.revoke(officeUser.id, role.id);

      expect(await userRoleRepo.findRoleIdsByOfficeUserId(officeUser.id)).toEqual([]);
    });

    it("enforces the (office_user_id, role_id) unique constraint — granting the same role twice fails loudly", async () => {
      const { office, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);
      await userRoleRepo.grant(officeUser.id, role.id, null);

      await expect(userRoleRepo.grant(officeUser.id, role.id, null)).rejects.toThrow(/duplicate key value/i);
    });

    it("role_permission grants and reads back permission ids for a set of roles", async () => {
      const { office } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);
      const patientView = await permissionRepo.findByCode("patient.view");
      const clinicalView = await permissionRepo.findByCode("clinical.view");
      if (!patientView || !clinicalView) throw new Error("seed data missing in test setup");

      await rolePermissionRepo.grant(role.id, patientView.id);
      await rolePermissionRepo.grant(role.id, clinicalView.id);

      const permissionIds = await rolePermissionRepo.findPermissionIdsByRoleIds([role.id]);
      expect([...permissionIds].sort()).toEqual([patientView.id, clinicalView.id].sort());
    });
  });

  describe("UserPermissionException", () => {
    async function seedOfficeUser() {
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
        displayName: "Test User",
      });
      await userAccountRepo.create(account);
      const officeUser = OfficeUser.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        userId: account.id,
      });
      await officeUserRepo.create(officeUser, null);
      return officeUser;
    }

    it("creates a grant exception and reads it back with its permission code resolved", async () => {
      const officeUser = await seedOfficeUser();
      const refund = await permissionRepo.findByCode("ledger.refund");
      if (!refund) throw new Error("seed data missing in test setup");
      const now = new Date();

      const exception = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId: officeUser.id,
        permissionCode: "ledger.refund",
        effect: "grant",
        reason: "Covering for the manager during a two-week leave",
        now,
      });
      await userPermissionExceptionRepo.create(exception, refund.id, null);

      const found = await userPermissionExceptionRepo.findByOfficeUserId(officeUser.id);
      expect(found).toHaveLength(1);
      expect(found[0]?.permissionCode).toBe("ledger.refund");
      expect(found[0]?.effect).toBe("grant");
      expect(found[0]?.reason).toBe("Covering for the manager during a two-week leave");
      expect(found[0]?.isActiveAt(now)).toBe(true);
    });

    it("resolves multiple exceptions across different permissions correctly, not just the first one found", async () => {
      const officeUser = await seedOfficeUser();
      const refund = await permissionRepo.findByCode("ledger.refund");
      const discount = await permissionRepo.findByCode("ledger.discount");
      if (!refund || !discount) throw new Error("seed data missing in test setup");
      const now = new Date();

      await userPermissionExceptionRepo.create(
        UserPermissionException.create({
          id: asUuid(randomUUID()),
          officeUserId: officeUser.id,
          permissionCode: "ledger.refund",
          effect: "grant",
          reason: "reason A",
          now,
        }),
        refund.id,
        null,
      );
      await userPermissionExceptionRepo.create(
        UserPermissionException.create({
          id: asUuid(randomUUID()),
          officeUserId: officeUser.id,
          permissionCode: "ledger.discount",
          effect: "deny",
          reason: "reason B",
          now,
        }),
        discount.id,
        null,
      );

      const found = await userPermissionExceptionRepo.findByOfficeUserId(officeUser.id);
      const byCode = new Map(found.map((e) => [e.permissionCode, e]));
      expect(byCode.get("ledger.refund")?.effect).toBe("grant");
      expect(byCode.get("ledger.discount")?.effect).toBe("deny");
    });
  });

  describe("ResolveEffectivePermissionsUseCase (against real Postgres, not mocked repositories)", () => {
    async function seedOfficeUser() {
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
        displayName: "Test User",
      });
      await userAccountRepo.create(account);
      const officeUser = OfficeUser.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        userId: account.id,
      });
      await officeUserRepo.create(officeUser, null);
      return { office, account, officeUser };
    }

    function buildUseCase(): ResolveEffectivePermissionsUseCase {
      return new ResolveEffectivePermissionsUseCase(
        officeUserRepo,
        userRoleRepo,
        rolePermissionRepo,
        permissionRepo,
        userPermissionExceptionRepo,
      );
    }

    it("resolves a real role's real grants through the actual joins, not a mocked shortcut", async () => {
      const { office, account, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "dentist",
        name: "Dentist",
      });
      await roleRepo.create(role, null);
      const patientView = await permissionRepo.findByCode("patient.view");
      const clinicalNoteSign = await permissionRepo.findByCode("clinical.note.sign");
      if (!patientView || !clinicalNoteSign) throw new Error("seed data missing in test setup");
      await rolePermissionRepo.grant(role.id, patientView.id);
      await rolePermissionRepo.grant(role.id, clinicalNoteSign.id);
      await userRoleRepo.grant(officeUser.id, role.id, null);

      const useCase = buildUseCase();
      const effective = await useCase.execute({ userId: account.id, officeId: office.id });

      expect(effective).toEqual(new Set(["patient.view", "clinical.note.sign"]));
      expect(await useCase.hasPermission(account.id, office.id, "patient.view")).toBe(true);
      expect(await useCase.hasPermission(account.id, office.id, "ledger.refund")).toBe(false);
    });

    it("a real deny exception withdraws a real role grant end to end", async () => {
      const { office, account, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "cashier",
        name: "Cashier",
      });
      await roleRepo.create(role, null);
      const refund = await permissionRepo.findByCode("ledger.refund");
      if (!refund) throw new Error("seed data missing in test setup");
      await rolePermissionRepo.grant(role.id, refund.id);
      await userRoleRepo.grant(officeUser.id, role.id, null);

      const useCase = buildUseCase();
      expect(await useCase.hasPermission(account.id, office.id, "ledger.refund")).toBe(true);

      await userPermissionExceptionRepo.create(
        UserPermissionException.create({
          id: asUuid(randomUUID()),
          officeUserId: officeUser.id,
          permissionCode: "ledger.refund",
          effect: "deny",
          reason: "Under investigation",
          now: new Date(),
        }),
        refund.id,
        null,
      );

      expect(await useCase.hasPermission(account.id, office.id, "ledger.refund")).toBe(false);
    });

    it("revoking the role removes the grant, without needing to touch the exception at all", async () => {
      const { office, account, officeUser } = await seedOfficeUser();
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: office.id,
        code: "assistant",
        name: "Assistant",
      });
      await roleRepo.create(role, null);
      const patientView = await permissionRepo.findByCode("patient.view");
      if (!patientView) throw new Error("seed data missing in test setup");
      await rolePermissionRepo.grant(role.id, patientView.id);
      await userRoleRepo.grant(officeUser.id, role.id, null);

      const useCase = buildUseCase();
      expect(await useCase.hasPermission(account.id, office.id, "patient.view")).toBe(true);

      await userRoleRepo.revoke(officeUser.id, role.id);

      expect(await useCase.hasPermission(account.id, office.id, "patient.view")).toBe(false);
    });
  });

  describe("SeedDefaultRolesUseCase (the shared logic the migration and future office-creation both run)", () => {
    // Asserts structural/semantic properties, not exact grant counts — the
    // seed data's own comment is explicit that this is a reasoned starting
    // point for DISC-003, meant to be correctable through real office use,
    // not a locked spec. A test pinning every count would fight the next
    // legitimate adjustment instead of catching a real bug.
    //
    // Each test seeds its own fresh office rather than depending on
    // whatever the historical migration did to a specific pre-existing
    // office — that dependency is exactly what made an earlier version of
    // this suite pass against the shared dev database (where a "main"
    // office already existed from manual bootstrapping) while failing
    // against the isolated dentix_test database used by `test:int` (which
    // starts with none). A real bug, caught by running the actual command
    // this suite is supposed to be verified by, not just by eyeballing the
    // dev database.
    const ROLE_CODES = [
      "dentist",
      "dental_assistant",
      "receptionist",
      "cashier",
      "office_manager",
      "system_administrator",
    ];

    async function seedOfficeWithDefaultRoles() {
      const office = Office.create({
        id: asUuid(randomUUID()),
        code: `t-${randomUUID().slice(0, 6)}`,
        timezone: "Asia/Tehran",
      });
      await officeRepo.create(office);
      const seedRoles = new SeedDefaultRolesUseCase(roleRepo, permissionRepo, rolePermissionRepo);
      await seedRoles.execute({ officeId: office.id });
      return office;
    }

    async function grantedCodesFor(office: Office, roleCode: string): Promise<Set<string>> {
      const role = await roleRepo.findByOfficeIdAndCode(office.id, roleCode);
      if (!role) throw new Error(`role '${roleCode}' not seeded`);
      const permissionIds = await rolePermissionRepo.findPermissionIdsByRoleIds([role.id]);
      const allPermissions = await permissionRepo.findAll();
      const idToCode = new Map(allPermissions.map((p) => [p.id, p.code]));
      return new Set(permissionIds.map((id) => idToCode.get(id)).filter((code): code is string => !!code));
    }

    it("seeds all six default roles for a freshly created office", async () => {
      const office = await seedOfficeWithDefaultRoles();
      for (const code of ROLE_CODES) {
        expect(await roleRepo.findByOfficeIdAndCode(office.id, code)).not.toBeNull();
      }
    });

    it("dentist gets full clinical authority, including signing — the core of the role", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "dentist");
      expect(granted.has("clinical.note.sign")).toBe(true);
      expect(granted.has("clinical.procedure.complete")).toBe(true);
      expect(granted.has("treatment-plan.create")).toBe(true);
    });

    it("dental assistant can draft notes but not sign them — matches the permission doc's own table exactly", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "dental_assistant");
      expect(granted.has("clinical.note.edit-draft")).toBe(true);
      expect(granted.has("clinical.note.sign")).toBe(false);
    });

    it("receptionist posts payments by default — Ali's explicit separation-of-duty decision", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "receptionist");
      expect(granted.has("ledger.post-payment")).toBe(true);
    });

    it("system administrator gets no clinical or patient access by default (rule 6)", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "system_administrator");
      expect(granted.has("patient.view")).toBe(false);
      expect(granted.has("clinical.view")).toBe(false);
    });

    it("system administrator is still a valid refund/discount/reversal approver — Ali's explicit decision", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "system_administrator");
      expect(granted.has("ledger.refund")).toBe(true);
      expect(granted.has("ledger.discount")).toBe(true);
      expect(granted.has("ledger.reverse")).toBe(true);
    });

    it("cashier does not get user/permission administration — least privilege outside its stated scope", async () => {
      const office = await seedOfficeWithDefaultRoles();
      const granted = await grantedCodesFor(office, "cashier");
      expect(granted.has("user.manage")).toBe(false);
      expect(granted.has("permission.manage")).toBe(false);
    });

    it("office manager, not cashier, can reverse a ledger entry", async () => {
      const office = await seedOfficeWithDefaultRoles();
      expect((await grantedCodesFor(office, "office_manager")).has("ledger.reverse")).toBe(true);
      expect((await grantedCodesFor(office, "cashier")).has("ledger.reverse")).toBe(false);
    });
  });
});
