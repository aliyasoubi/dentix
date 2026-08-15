import { randomUUID } from "crypto";
import { asUuid, Uuid } from "@dentix/kernel";
import { ResolveEffectivePermissionsUseCase } from "./resolve-effective-permissions.use-case";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { UserPermissionException } from "../../domain/entities/user-permission-exception.entity";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import type { PermissionRecord, PermissionRepository } from "../../domain/repositories/permission.repository";
import type { RolePermissionRepository } from "../../domain/repositories/role-permission.repository";
import type { UserPermissionExceptionRepository } from "../../domain/repositories/user-permission-exception.repository";
import type { UserRoleRepository } from "../../domain/repositories/user-role.repository";
import { PermissionCode } from "../../domain/value-objects/permission-code";

describe("ResolveEffectivePermissionsUseCase", () => {
  const userId = asUuid(randomUUID());
  const officeId = asUuid(randomUUID());
  const officeUserId = asUuid(randomUUID());
  const roleId = asUuid(randomUUID());

  const ALL_PERMISSIONS: PermissionRecord[] = [
    { id: asUuid(randomUUID()), code: "patient.view" },
    { id: asUuid(randomUUID()), code: "ledger.refund" },
    { id: asUuid(randomUUID()), code: "ledger.discount" },
    { id: asUuid(randomUUID()), code: "user.manage" },
  ];
  function permissionId(code: PermissionCode): Uuid {
    const record = ALL_PERMISSIONS.find((p) => p.code === code);
    if (!record) throw new Error(`test fixture missing ${code}`);
    return record.id;
  }

  function buildUseCase(options: {
    officeUser?: OfficeUser | null;
    roleIds?: readonly Uuid[];
    grantedPermissionIds?: readonly Uuid[];
    exceptions?: readonly UserPermissionException[];
  }): ResolveEffectivePermissionsUseCase {
    const officeUser =
      options.officeUser === undefined
        ? OfficeUser.reconstitute({
            id: officeUserId,
            officeId,
            userId,
            permissionVersion: 1,
            isActive: true,
          })
        : options.officeUser;

    const officeUsers: OfficeUserRepository = {
      findByUserId: jest.fn<Promise<OfficeUser | null>, [Uuid]>().mockResolvedValue(officeUser),
      create: jest.fn(),
    };
    const userRoles: UserRoleRepository = {
      findRoleIdsByOfficeUserId: jest
        .fn<Promise<readonly Uuid[]>, [Uuid]>()
        .mockResolvedValue(options.roleIds ?? [roleId]),
      grant: jest.fn(),
      revoke: jest.fn(),
    };
    const rolePermissions: RolePermissionRepository = {
      findPermissionIdsByRoleIds: jest
        .fn<Promise<readonly Uuid[]>, [readonly Uuid[]]>()
        .mockResolvedValue(options.grantedPermissionIds ?? [permissionId("patient.view")]),
      grant: jest.fn(),
    };
    const permissions: PermissionRepository = {
      findAll: jest.fn<Promise<readonly PermissionRecord[]>, []>().mockResolvedValue(ALL_PERMISSIONS),
      findByCode: jest.fn(),
      findByCodes: jest.fn(),
    };
    const exceptions: UserPermissionExceptionRepository = {
      findByOfficeUserId: jest
        .fn<Promise<readonly UserPermissionException[]>, [Uuid]>()
        .mockResolvedValue(options.exceptions ?? []),
      create: jest.fn(),
    };

    return new ResolveEffectivePermissionsUseCase(
      officeUsers,
      userRoles,
      rolePermissions,
      permissions,
      exceptions,
    );
  }

  it("grants exactly the permissions the user's roles carry", async () => {
    const useCase = buildUseCase({ grantedPermissionIds: [permissionId("patient.view")] });
    const effective = await useCase.execute({ userId, officeId });
    expect(effective).toEqual(new Set(["patient.view"]));
  });

  it("returns nothing for a user with no active office membership — fail closed", async () => {
    const useCase = buildUseCase({ officeUser: null });
    const effective = await useCase.execute({ userId, officeId });
    expect(effective.size).toBe(0);
  });

  it("returns nothing for a deactivated membership, even with role grants on file", async () => {
    const useCase = buildUseCase({
      officeUser: OfficeUser.reconstitute({
        id: officeUserId,
        officeId,
        userId,
        permissionVersion: 1,
        isActive: false,
      }),
      grantedPermissionIds: [permissionId("patient.view")],
    });
    const effective = await useCase.execute({ userId, officeId });
    expect(effective.size).toBe(0);
  });

  it("returns nothing when the membership belongs to a different office than requested", async () => {
    const useCase = buildUseCase({
      officeUser: OfficeUser.reconstitute({
        id: officeUserId,
        officeId: asUuid(randomUUID()), // a different office
        userId,
        permissionVersion: 1,
        isActive: true,
      }),
    });
    const effective = await useCase.execute({ userId, officeId });
    expect(effective.size).toBe(0);
  });

  describe("exceptions", () => {
    it("a grant exception adds a permission no role provides", async () => {
      const exception = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "ledger.refund",
        effect: "grant",
        reason: "Covering for the manager",
        now: new Date(),
      });
      const useCase = buildUseCase({
        grantedPermissionIds: [permissionId("patient.view")],
        exceptions: [exception],
      });
      const effective = await useCase.execute({ userId, officeId });
      expect(effective).toEqual(new Set(["patient.view", "ledger.refund"]));
    });

    it("a deny exception withdraws a permission a role otherwise grants", async () => {
      const exception = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "patient.view",
        effect: "deny",
        reason: "Under review",
        now: new Date(),
      });
      const useCase = buildUseCase({
        grantedPermissionIds: [permissionId("patient.view")],
        exceptions: [exception],
      });
      const effective = await useCase.execute({ userId, officeId });
      expect(effective.has("patient.view")).toBe(false);
    });

    it("deny wins even against a grant exception for the same code — no contradictory pair resolves to allowed", async () => {
      const now = new Date();
      const grant = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "user.manage",
        effect: "grant",
        reason: "grant reason",
        now,
      });
      const deny = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "user.manage",
        effect: "deny",
        reason: "deny reason",
        now,
      });
      const useCase = buildUseCase({ grantedPermissionIds: [], exceptions: [grant, deny] });
      const effective = await useCase.execute({ userId, officeId });
      expect(effective.has("user.manage")).toBe(false);
    });

    it("ignores an exception that has not reached its effective time yet", async () => {
      const future = new Date(Date.now() + 60_000);
      const exception = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "ledger.discount",
        effect: "grant",
        reason: "reason",
        now: future,
      });
      const useCase = buildUseCase({ grantedPermissionIds: [], exceptions: [exception] });
      const effective = await useCase.execute({ userId, officeId });
      expect(effective.has("ledger.discount")).toBe(false);
    });

    it("ignores a revoked exception", async () => {
      const now = new Date();
      const exception = UserPermissionException.create({
        id: asUuid(randomUUID()),
        officeUserId,
        permissionCode: "ledger.discount",
        effect: "grant",
        reason: "reason",
        now,
      }).revoke(now);
      const useCase = buildUseCase({ grantedPermissionIds: [], exceptions: [exception] });
      const effective = await useCase.execute({ userId, officeId });
      expect(effective.has("ledger.discount")).toBe(false);
    });
  });

  describe("hasPermission (AuthorizationPort)", () => {
    it("is true when the resolved set contains the code", async () => {
      const useCase = buildUseCase({ grantedPermissionIds: [permissionId("patient.view")] });
      expect(await useCase.hasPermission(userId, officeId, "patient.view")).toBe(true);
    });

    it("is false when it does not", async () => {
      const useCase = buildUseCase({ grantedPermissionIds: [permissionId("patient.view")] });
      expect(await useCase.hasPermission(userId, officeId, "user.manage")).toBe(false);
    });
  });
});
