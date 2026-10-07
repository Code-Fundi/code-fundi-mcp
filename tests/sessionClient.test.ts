import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CodeFundiClient, getClient, _resetClientForTests } from "../src/client.js";
import {
  clientFromSession,
  isHttpStreamTransport,
  authenticateHttpRequest,
} from "../src/sessionClient.js";

describe("session client vs singleton", () => {
  const prev = process.env.CODEFUNDI_MCP_TRANSPORT;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.CODEFUNDI_MCP_TRANSPORT;
    } else {
      process.env.CODEFUNDI_MCP_TRANSPORT = prev;
    }
    _resetClientForTests();
  });

  it("stdio getClient returns singleton", () => {
    delete process.env.CODEFUNDI_MCP_TRANSPORT;
    const a = getClient();
    const b = getClient();
    expect(a).toBe(b);
  });

  it("httpStream getClient without session throws", () => {
    process.env.CODEFUNDI_MCP_TRANSPORT = "httpStream";
    expect(() => getClient()).toThrow(/per-session|singleton/i);
  });

  it("httpStream accepts explicit session client", () => {
    process.env.CODEFUNDI_MCP_TRANSPORT = "httpStream";
    const sessionClient = new CodeFundiClient("https://api.codefundi.app", "pk_live_test");
    expect(getClient(sessionClient)).toBe(sessionClient);
  });

  it("clientFromSession forbids singleton under httpStream", () => {
    process.env.CODEFUNDI_MCP_TRANSPORT = "httpStream";
    expect(isHttpStreamTransport()).toBe(true);
    expect(() => clientFromSession(undefined, () => getClient())).toThrow(/per-session/i);
    const sessionClient = new CodeFundiClient("https://api.codefundi.app", "key");
    expect(
      clientFromSession({ apiKey: "key", client: sessionClient }, () => getClient())
    ).toBe(sessionClient);
  });
});

describe("authenticateHttpRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds session from X-API-Key", async () => {
    const auth = await authenticateHttpRequest({
      headers: { "x-api-key": "pk_live_abc" },
    });
    expect(auth.apiKey).toBe("pk_live_abc");
    expect(auth.client).toBeInstanceOf(CodeFundiClient);
  });

  it("resolves Bearer via /oauth/resolve", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ api_key: "system-uuid-key", user_id: "u1", key_kind: "system" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const auth = await authenticateHttpRequest({
      headers: { authorization: "Bearer access-token" },
    });
    expect(auth.apiKey).toBe("system-uuid-key");
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/oauth\/resolve$/);
    expect(init.headers.Authorization).toMatch(/^Bearer /);
  });
});
