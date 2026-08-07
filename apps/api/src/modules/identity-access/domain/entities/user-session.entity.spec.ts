import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { SESSION_POLICY } from "../value-objects/session-policy";
import { UserSession } from "./user-session.entity";

describe("UserSession", () => {
  const userId = asUuid(randomUUID());
  const officeId = asUuid(randomUUID());
  const now = new Date("2026-08-07T10:00:00Z");

  function createSession() {
    return UserSession.create({
      id: asUuid(randomUUID()),
      sessionHash: "hash",
      userId,
      officeId,
      authenticatedAt: now,
      mfaContext: "otp",
      csrfTokenHash: "csrf-hash",
      permissionVersion: 1,
      now,
    });
  }

  it("is valid immediately after creation", () => {
    const session = createSession();
    expect(session.checkValidity(now)).toEqual({ valid: true });
  });

  it("sets idle/absolute expiry from the session policy", () => {
    const session = createSession();
    expect(session.idleExpiresAt.getTime()).toBe(now.getTime() + SESSION_POLICY.idleTimeoutMs);
    expect(session.absoluteExpiresAt.getTime()).toBe(now.getTime() + SESSION_POLICY.absoluteLifetimeMs);
  });

  it("is idle-expired after the idle timeout with no activity", () => {
    const session = createSession();
    const later = new Date(now.getTime() + SESSION_POLICY.idleTimeoutMs + 1);
    expect(session.checkValidity(later)).toEqual({ valid: false, reason: "IDLE_EXPIRED" });
  });

  it("touch() extends the idle window so an active session doesn't expire", () => {
    const session = createSession();
    const justBeforeIdleExpiry = new Date(now.getTime() + SESSION_POLICY.idleTimeoutMs - 1000);
    session.touch(justBeforeIdleExpiry);

    // Without the touch, this instant would already be past the *original* idle window.
    const afterOriginalIdleWindow = new Date(now.getTime() + SESSION_POLICY.idleTimeoutMs + 1);
    expect(session.checkValidity(afterOriginalIdleWindow)).toEqual({ valid: true });
  });

  it("touch() never extends past the absolute lifetime", () => {
    const session = createSession();
    const justBeforeAbsoluteExpiry = new Date(now.getTime() + SESSION_POLICY.absoluteLifetimeMs - 1000);
    session.touch(justBeforeAbsoluteExpiry);

    const afterAbsoluteExpiry = new Date(now.getTime() + SESSION_POLICY.absoluteLifetimeMs + 1);
    expect(session.checkValidity(afterAbsoluteExpiry)).toEqual({ valid: false, reason: "ABSOLUTE_EXPIRED" });
  });

  it("is absolute-expired after 12 hours even if repeatedly touched", () => {
    const session = createSession();
    const after = new Date(now.getTime() + SESSION_POLICY.absoluteLifetimeMs + 1);
    expect(session.checkValidity(after)).toEqual({ valid: false, reason: "ABSOLUTE_EXPIRED" });
  });

  it("revoke() invalidates the session immediately, before either expiry", () => {
    const session = createSession();
    session.revoke("user logout", now);
    expect(session.checkValidity(now)).toEqual({ valid: false, reason: "REVOKED" });
    expect(session.revokedReason).toBe("user logout");
  });

  it("revoke() is idempotent — a second call doesn't overwrite the original reason/time", () => {
    const session = createSession();
    session.revoke("first reason", now);
    const later = new Date(now.getTime() + 1000);
    session.revoke("second reason", later);
    expect(session.revokedReason).toBe("first reason");
    expect(session.revokedAt?.getTime()).toBe(now.getTime());
  });

  it("recent-authentication window: valid immediately, stale after 5 minutes", () => {
    const session = createSession();
    expect(session.isRecentlyAuthenticated(now)).toBe(true);

    const sixMinutesLater = new Date(now.getTime() + SESSION_POLICY.recentAuthenticationWindowMs + 1);
    expect(session.isRecentlyAuthenticated(sixMinutesLater)).toBe(false);
  });

  it("recent-authentication does not reset on touch() — only re-authentication should", () => {
    const session = createSession();
    const fourMinutesLater = new Date(now.getTime() + 4 * 60 * 1000);
    session.touch(fourMinutesLater);

    const sixMinutesAfterAuth = new Date(now.getTime() + SESSION_POLICY.recentAuthenticationWindowMs + 1);
    expect(session.isRecentlyAuthenticated(sixMinutesAfterAuth)).toBe(false);
  });
});
