import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { randomUUID } from "crypto";
import { asUuid } from "@dentix/kernel";
import { PermissionGuard } from "./permission.guard";
import { RequestWithSession } from "./session.guard";
import { UserSession } from "../../domain/entities/user-session.entity";
import type { AuthorizationPort } from "../../application/ports/authorization.port";

describe("PermissionGuard", () => {
  const userId = asUuid(randomUUID());
  const officeId = asUuid(randomUUID());

  function buildSession(): UserSession {
    const now = new Date();
    return UserSession.create({
      id: asUuid(randomUUID()),
      sessionHash: "hash",
      userId,
      officeId,
      authenticatedAt: now,
      mfaContext: "otp",
      csrfTokenHash: "csrf",
      permissionVersion: 1,
      now,
    });
  }

  function buildContext(session: UserSession | undefined): ExecutionContext {
    const request: RequestWithSession = { currentSession: session } as RequestWithSession;
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function buildGuard(
    requiredPermission: string | undefined,
    hasPermission: jest.Mock<Promise<boolean>, [unknown, unknown, unknown]>,
  ): PermissionGuard {
    const reflector = { get: jest.fn().mockReturnValue(requiredPermission) } as unknown as Reflector;
    const authorization: AuthorizationPort = { hasPermission };
    return new PermissionGuard(reflector, authorization);
  }

  it("passes routes with no @RequirePermission() decorator, without ever calling the port", async () => {
    const hasPermission = jest.fn<Promise<boolean>, [unknown, unknown, unknown]>();
    const guard = buildGuard(undefined, hasPermission);

    const result = await guard.canActivate(buildContext(buildSession()));

    expect(result).toBe(true);
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it("allows the request when the port grants the required permission", async () => {
    const hasPermission = jest.fn<Promise<boolean>, [unknown, unknown, unknown]>().mockResolvedValue(true);
    const guard = buildGuard("user.manage", hasPermission);

    const result = await guard.canActivate(buildContext(buildSession()));

    expect(result).toBe(true);
    expect(hasPermission.mock.calls[0]?.[0]).toBe(userId);
    expect(hasPermission.mock.calls[0]?.[1]).toBe(officeId);
    expect(hasPermission.mock.calls[0]?.[2]).toBe("user.manage");
  });

  it("throws 403 MISSING_PERMISSION when the port denies it — never a silent false", async () => {
    const hasPermission = jest.fn<Promise<boolean>, [unknown, unknown, unknown]>().mockResolvedValue(false);
    const guard = buildGuard("user.manage", hasPermission);

    await expect(guard.canActivate(buildContext(buildSession()))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(buildContext(buildSession()))).rejects.toThrow("MISSING_PERMISSION");
  });

  it("throws a programmer error if used without SessionGuard having run first", async () => {
    const hasPermission = jest.fn<Promise<boolean>, [unknown, unknown, unknown]>();
    const guard = buildGuard("user.manage", hasPermission);

    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(/SessionGuard/);
  });
});
