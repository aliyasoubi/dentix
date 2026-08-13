import { KeycloakAdminHttpAdapter } from "./keycloak-admin-http.adapter";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response;
}

type FetchMock = jest.Mock<ReturnType<typeof fetch>, Parameters<typeof fetch>>;

describe("KeycloakAdminHttpAdapter", () => {
  const originalEnv = { ...process.env };
  let fetchMock: FetchMock;

  beforeEach(() => {
    process.env["KEYCLOAK_ADMIN_URL"] = "http://keycloak-internal:8080";
    process.env["KEYCLOAK_REALM"] = "dentix";
    process.env["KEYCLOAK_ADMIN"] = "admin";
    process.env["KEYCLOAK_ADMIN_PASSWORD"] = "admin-secret";
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("authenticates against the master realm, then looks up the user by exact email", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "admin-token" }))
      .mockResolvedValueOnce(
        jsonResponse([{ id: "kc-subject-1", email: "reza@example.com", enabled: true }]),
      );

    const adapter = new KeycloakAdminHttpAdapter();
    const result = await adapter.findUserByEmail("reza@example.com");

    expect(result).toEqual({ subject: "kc-subject-1", email: "reza@example.com", enabled: true });

    const [tokenCall, lookupCall] = fetchMock.mock.calls;
    expect(tokenCall[0]).toBe("http://keycloak-internal:8080/realms/master/protocol/openid-connect/token");
    expect(lookupCall[0]).toBe(
      "http://keycloak-internal:8080/admin/realms/dentix/users?email=reza%40example.com&exact=true",
    );
    // The adapter always passes a plain { Authorization } object, never a
    // Headers instance — narrower than RequestInit['headers']'s own type,
    // so this reflects what the code under test actually constructs.
    const lookupHeaders = lookupCall[1]?.headers as Record<string, string> | undefined;
    expect(lookupHeaders?.["Authorization"]).toBe("Bearer admin-token");
  });

  it("returns null when no user matches", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "admin-token" }))
      .mockResolvedValueOnce(jsonResponse([]));

    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("nobody@example.com")).resolves.toBeNull();
  });

  // Keycloak's ?email= filter is documented as a substring match unless
  // ?exact=true is also honoured — belt and suspenders: this test locks in
  // that the adapter itself re-checks for an exact (case-insensitive) match
  // rather than trusting the server-side filter alone.
  it("ignores a case-different or substring email the server returns", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "admin-token" }))
      .mockResolvedValueOnce(
        jsonResponse([{ id: "kc-subject-2", email: "reza-second@example.com", enabled: true }]),
      );

    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("reza@example.com")).resolves.toBeNull();
  });

  it("matches case-insensitively", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "admin-token" }))
      .mockResolvedValueOnce(
        jsonResponse([{ id: "kc-subject-3", email: "Reza@Example.com", enabled: true }]),
      );

    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("reza@example.com")).resolves.toEqual({
      subject: "kc-subject-3",
      email: "Reza@Example.com",
      enabled: true,
    });
  });

  it("throws when Keycloak admin authentication itself fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 401));

    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("reza@example.com")).rejects.toThrow(/authentication failed/);
  });

  it("throws when the user-lookup call itself fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "admin-token" }))
      .mockResolvedValueOnce(jsonResponse({}, false, 500));

    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("reza@example.com")).rejects.toThrow(/lookup failed/);
  });

  it("requires KEYCLOAK_ADMIN_URL to be configured", async () => {
    delete process.env["KEYCLOAK_ADMIN_URL"];
    const adapter = new KeycloakAdminHttpAdapter();
    await expect(adapter.findUserByEmail("reza@example.com")).rejects.toThrow(/KEYCLOAK_ADMIN_URL/);
  });
});
