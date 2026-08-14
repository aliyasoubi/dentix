import { randomUUID } from "crypto";
import { asUuid, Uuid } from "@dentix/kernel";
import { SeedDefaultRolesUseCase } from "./seed-default-roles.use-case";
import { Role } from "../../domain/entities/role.entity";
import type { PermissionRecord, PermissionRepository } from "../../domain/repositories/permission.repository";
import type { RoleRepository } from "../../domain/repositories/role.repository";
import type { RolePermissionRepository } from "../../domain/repositories/role-permission.repository";
import { DEFAULT_ROLE_DEFINITIONS } from "../../domain/value-objects/default-role-definitions";
import { PERMISSION_CODES } from "../../domain/value-objects/permission-code";

describe("SeedDefaultRolesUseCase", () => {
  const officeId = asUuid(randomUUID());

  function buildUseCase(): {
    useCase: SeedDefaultRolesUseCase;
    roles: { create: jest.Mock<Promise<void>, [Role, Uuid | null, unknown?]> };
    rolePermissions: { grant: jest.Mock<Promise<void>, [Uuid, Uuid, unknown?]> };
  } {
    const allPermissions: PermissionRecord[] = PERMISSION_CODES.map((code) => ({
      id: asUuid(randomUUID()),
      code,
    }));
    const permissions: PermissionRepository = {
      findAll: jest.fn<Promise<readonly PermissionRecord[]>, []>().mockResolvedValue(allPermissions),
      findByCode: jest.fn(),
      findByCodes: jest.fn(),
    };
    const roles: RoleRepository = {
      create: jest.fn<Promise<void>, [Role, Uuid | null, unknown?]>().mockResolvedValue(undefined),
      findByOfficeIdAndCode: jest.fn(),
      findByIds: jest.fn(),
    };
    const rolePermissions: RolePermissionRepository = {
      grant: jest.fn<Promise<void>, [Uuid, Uuid, unknown?]>().mockResolvedValue(undefined),
      findPermissionIdsByRoleIds: jest.fn(),
    };

    const useCase = new SeedDefaultRolesUseCase(roles, permissions, rolePermissions);
    return {
      useCase,
      roles: roles as unknown as { create: jest.Mock<Promise<void>, [Role, Uuid | null, unknown?]> },
      rolePermissions: rolePermissions as unknown as {
        grant: jest.Mock<Promise<void>, [Uuid, Uuid, unknown?]>;
      },
    };
  }

  it("creates all six default roles for the office", async () => {
    const { useCase, roles } = buildUseCase();
    await useCase.execute({ officeId });

    expect(roles.create).toHaveBeenCalledTimes(DEFAULT_ROLE_DEFINITIONS.length);
    const createdCodes = roles.create.mock.calls.map((call) => call[0].code).sort();
    expect(createdCodes).toEqual([...DEFAULT_ROLE_DEFINITIONS.map((d) => d.code)].sort());
  });

  it("every created role belongs to the requested office", async () => {
    const { useCase, roles } = buildUseCase();
    await useCase.execute({ officeId });

    for (const call of roles.create.mock.calls) {
      expect(call[0].officeId).toBe(officeId);
    }
  });

  it("grants exactly the permission count each role definition declares", async () => {
    const { useCase, rolePermissions } = buildUseCase();
    await useCase.execute({ officeId });

    const totalExpectedGrants = DEFAULT_ROLE_DEFINITIONS.reduce((sum, d) => sum + d.permissions.length, 0);
    expect(rolePermissions.grant).toHaveBeenCalledTimes(totalExpectedGrants);
  });

  it("throws if a role definition references a permission code that does not exist — a real invariant break, not a silent skip", async () => {
    const permissions: PermissionRepository = {
      findAll: jest.fn<Promise<readonly PermissionRecord[]>, []>().mockResolvedValue([]), // nothing seeded
      findByCode: jest.fn(),
      findByCodes: jest.fn(),
    };
    const roles: RoleRepository = {
      create: jest.fn<Promise<void>, [Role, Uuid | null, unknown?]>().mockResolvedValue(undefined),
      findByOfficeIdAndCode: jest.fn(),
      findByIds: jest.fn(),
    };
    const rolePermissions: RolePermissionRepository = {
      grant: jest.fn(),
      findPermissionIdsByRoleIds: jest.fn(),
    };
    const useCase = new SeedDefaultRolesUseCase(roles, permissions, rolePermissions);

    await expect(useCase.execute({ officeId })).rejects.toThrow(/unknown permission code/);
  });
});
