import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { UserAccount } from "./user-account.entity";

describe("UserAccount", () => {
  const id = asUuid(randomUUID());

  it("creates an active account", () => {
    const account = UserAccount.create({
      id,
      externalSubject: "sub-123",
      issuer: "https://kc.local/realms/dentix",
      displayName: "Dev Dentist",
    });
    expect(account.isActive()).toBe(true);
    expect(account.state).toBe("active");
  });

  it("rejects an empty external subject", () => {
    expect(() =>
      UserAccount.create({ id, externalSubject: "  ", issuer: "https://kc.local", displayName: "x" }),
    ).toThrow(/external subject/i);
  });

  it("rejects an empty issuer", () => {
    expect(() =>
      UserAccount.create({ id, externalSubject: "sub-123", issuer: " ", displayName: "x" }),
    ).toThrow(/issuer/i);
  });

  it("reconstitute reflects a disabled state without re-running create validation", () => {
    const account = UserAccount.reconstitute({
      id,
      externalSubject: "sub-123",
      issuer: "https://kc.local",
      displayName: "x",
      state: "disabled",
    });
    expect(account.isActive()).toBe(false);
  });
});
