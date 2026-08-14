import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { UserPermissionException } from "./user-permission-exception.entity";

describe("UserPermissionException", () => {
  const officeUserId = asUuid(randomUUID());
  const id = asUuid(randomUUID());
  const now = new Date("2026-08-15T10:00:00Z");

  function build(overrides: Partial<Parameters<typeof UserPermissionException.create>[0]> = {}) {
    return UserPermissionException.create({
      id,
      officeUserId,
      permissionCode: "ledger.refund",
      effect: "grant",
      reason: "Covering for the manager during a two-week leave",
      now,
      ...overrides,
    });
  }

  it("creates an active grant exception", () => {
    const exception = build();
    expect(exception.effect).toBe("grant");
    expect(exception.isActiveAt(now)).toBe(true);
  });

  it("rejects a blank reason — the whole point is a stated, auditable reason", () => {
    expect(() => build({ reason: "   " })).toThrow(/reason/i);
  });

  it("rejects an expiresAt that is not actually in the future", () => {
    expect(() => build({ expiresAt: now })).toThrow(/future/i);
  });

  describe("isActiveAt", () => {
    it("is inactive before its effective time", () => {
      const exception = build();
      const before = new Date(now.getTime() - 1000);
      expect(exception.isActiveAt(before)).toBe(false);
    });

    it("is inactive once its planned expiry has passed", () => {
      const expiresAt = new Date(now.getTime() + 60_000);
      const exception = build({ expiresAt });
      expect(exception.isActiveAt(new Date(expiresAt.getTime() + 1))).toBe(false);
      expect(exception.isActiveAt(new Date(expiresAt.getTime() - 1))).toBe(true);
    });

    it("has no expiry by default — stays active indefinitely until revoked", () => {
      const exception = build();
      const farFuture = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
      expect(exception.isActiveAt(farFuture)).toBe(true);
    });
  });

  describe("revoke", () => {
    it("becomes inactive from the moment of revocation, distinct from a planned expiry", () => {
      const exception = build();
      const revokedAt = new Date(now.getTime() + 1000);
      const revoked = exception.revoke(revokedAt);

      expect(revoked.revokedAt).toEqual(revokedAt);
      expect(revoked.isActiveAt(now)).toBe(true); // still active before the revoke moment
      expect(revoked.isActiveAt(revokedAt)).toBe(false);
    });

    it("is idempotent — revoking twice keeps the first revocation time", () => {
      const exception = build();
      const firstRevoke = new Date(now.getTime() + 1000);
      const secondRevoke = new Date(now.getTime() + 2000);

      const revokedOnce = exception.revoke(firstRevoke);
      const revokedTwice = revokedOnce.revoke(secondRevoke);

      expect(revokedTwice.revokedAt).toEqual(firstRevoke);
    });
  });
});
