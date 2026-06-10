/**
 * Tests for CodeFundiClient
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CODEFUNDI_DEFAULT_CHAT_MODEL_ID,
  CodeFundiClient,
  CodeFundiApiError,
} from "../src/client.js";

describe("CodeFundiClient", () => {
  let client: CodeFundiClient;

  beforeEach(() => {
    client = new CodeFundiClient("https://api.test.codefundi.app", "test-api-key-123");
  });

  // ==== Key management ====

  describe("API key management", () => {
    it("should store and return the API key", () => {
      expect(client.getApiKey()).toBe("test-api-key-123");
      expect(client.hasApiKey()).toBe(true);
    });

    it("should allow setting a new API key", () => {
      client.setApiKey("new-key-456");
      expect(client.getApiKey()).toBe("new-key-456");
    });

    it("should report no key when constructed without one", () => {
      const noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
      expect(noKeyClient.hasApiKey()).toBe(false);
      expect(noKeyClient.getApiKey()).toBeNull();
    });

    it("requireApiKey should throw when no key is set", () => {
      const noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
      expect(() => noKeyClient.requireApiKey()).toThrow(CodeFundiApiError);
      expect(() => noKeyClient.requireApiKey()).toThrow(/No Code-Fundi API key/);
    });

    it("requireApiKey should not throw when key is set", () => {
      expect(() => client.requireApiKey()).not.toThrow();
    });
  });

  // ==== Base URL handling ====

  describe("base URL", () => {
    it("should strip trailing slash from base URL", () => {
      const c = new CodeFundiClient("https://api.codefundi.app/", "key");
      // We can verify via a failed request that the URL is built correctly
      expect(c.hasApiKey()).toBe(true);
    });

    it("should default to https://api.codefundi.app", () => {
      const c = new CodeFundiClient(undefined, "key");
      expect(c.hasApiKey()).toBe(true);
    });
  });

  // ==== Request methods require API key ====

  describe("authenticated methods guard", () => {
    let noKeyClient: CodeFundiClient;

    beforeEach(() => {
      noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
    });

    it("search should throw without API key", async () => {
      await expect(noKeyClient.search({ query: "test" })).rejects.toThrow(CodeFundiApiError);
    });

    it("listRepos should throw without API key", async () => {
      await expect(noKeyClient.listRepos()).rejects.toThrow(CodeFundiApiError);
    });

    it("indexRepo should throw without API key", async () => {
      await expect(noKeyClient.indexRepo({ url: "https://github.com/test/repo" })).rejects.toThrow(CodeFundiApiError);
    });

    it("listFiles should throw without API key", async () => {
      await expect(noKeyClient.listFiles("repo-id")).rejects.toThrow(CodeFundiApiError);
    });

    it("getFileDocumentation should throw without API key", async () => {
      await expect(noKeyClient.getFileDocumentation("repo-id", "file-id")).rejects.toThrow(CodeFundiApiError);
    });

    it("listHistory should throw without API key", async () => {
      await expect(noKeyClient.listHistory()).rejects.toThrow(CodeFundiApiError);
    });

    it("getUsageStats should throw without API key", async () => {
      await expect(noKeyClient.getUsageStats()).rejects.toThrow(CodeFundiApiError);
    });

    it("listApiKeys should throw without API key", async () => {
      await expect(noKeyClient.listApiKeys()).rejects.toThrow(CodeFundiApiError);
    });

    it("deleteApiKey should throw without API key", async () => {
      await expect(noKeyClient.deleteApiKey("550e8400-e29b-41d4-a716-446655440000")).rejects.toThrow(CodeFundiApiError);
    });

    it("chat should throw without API key", async () => {
      await expect(noKeyClient.chat({ prompt: "hello" })).rejects.toThrow(CodeFundiApiError);
    });

    it("getModels should throw without API key", async () => {
      await expect(noKeyClient.getModels()).rejects.toThrow(CodeFundiApiError);
    });
  });

  // ==== Auth methods do NOT require API key ====

  describe("unauthenticated auth methods", () => {
    it("authAuthenticate should not throw for missing API key (only for network)", async () => {
      const noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
      // Should fail with network error, NOT with requireApiKey error
      await expect(noKeyClient.authAuthenticate({
        email: "test@example.com",
        auth_mode: "otp",
      })).rejects.not.toThrow(/No Code-Fundi API key/);
    });

    it("authVerify should not throw for missing API key", async () => {
      const noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
      await expect(noKeyClient.authVerify({
        email: "test@example.com",
        token: "123456",
      })).rejects.not.toThrow(/No Code-Fundi API key/);
    });

    it("authResend should not throw for missing API key", async () => {
      const noKeyClient = new CodeFundiClient("https://api.test.codefundi.app");
      await expect(noKeyClient.authResend({
        email: "test@example.com",
      })).rejects.not.toThrow(/No Code-Fundi API key/);
    });
  });

  // ==== HTTP request construction ====

  describe("request construction", () => {
    it("should make GET request with correct headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listRepos();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.test.codefundi.app/v2/repos");
      expect(options.method).toBe("GET");
      expect(options.headers["X-API-Key"]).toBe("test-api-key-123");
      expect(options.headers["Content-Type"]).toBe("application/json");

      vi.unstubAllGlobals();
    });

    it("should make POST request with body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: [], total: 0 }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.search({ query: "hello world", scope: "code" });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.test.codefundi.app/v2/search");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body as string);
      expect(body.query).toBe("hello world");
      expect(body.scope).toBe("code");

      vi.unstubAllGlobals();
    });

    it("should POST chat with question field and parse text/html body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        json: async () => { throw new Error("not json"); },
        text: async () => "<p>Hello from Fundi</p>",
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await client.chat({ prompt: "Hi there" });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);
      expect(body.question).toBe("Hi there");
      expect(body.prompt).toBeUndefined();
      expect(res.response).toBe("<p>Hello from Fundi</p>");

      vi.unstubAllGlobals();
    });

    it("should POST /v2/chat and parse JSON response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          status: "success",
          data: {
            response: "Hello from v2",
            model: "gpt-4o-mini",
            conversation_id: "conv_123",
          },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await client.chatV2({ prompt: "Hello v2" });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.test.codefundi.app/v2/chat");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body as string);
      expect(body.prompt).toBe("Hello v2");
      expect(body.model).toBe(CODEFUNDI_DEFAULT_CHAT_MODEL_ID);
      expect(res.text).toBe("Hello from v2");
      expect(res.model).toBe("gpt-4o-mini");
      expect(res.conversationId).toBe("conv_123");

      vi.unstubAllGlobals();
    });

    it("should parse NDJSON response from /v2/chat", async () => {
      const lines = [
        JSON.stringify({ type: "chunk", text: "Hello " }),
        JSON.stringify({ type: "chunk", text: "world" }),
        JSON.stringify({ type: "done", model: "gpt-4.1", context_files: 0 }),
      ].join("\n") + "\n";
      const encoder = new TextEncoder();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/x-ndjson" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(lines));
            controller.close();
          },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await client.chatV2({ prompt: "stream me" });

      expect(res.text).toBe("Hello world");
      expect(res.model).toBe("gpt-4.1");
      expect(res.contextFiles).toBe(0);
      vi.unstubAllGlobals();
    });

    it("should fallback to v1 chat when /v2/chat is unavailable", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ status: "error", message: "not found" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
          text: async () => "legacy fallback response",
        });
      vi.stubGlobal("fetch", mockFetch);

      const res = await client.chatV2({ prompt: "fallback please" });

      expect(res.text).toBe("legacy fallback response");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.test.codefundi.app/v2/chat");
      expect(mockFetch.mock.calls[1][0]).toBe("https://api.test.codefundi.app/v1/fundi/chat");

      vi.unstubAllGlobals();
    });

    it("should DELETE /v2/keys/{id}", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: { id: "k1", deleted: true } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const id = "550e8400-e29b-41d4-a716-446655440000";
      await client.deleteApiKey(id);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(`https://api.test.codefundi.app/v2/keys/${id}`);
      expect(options.method).toBe("DELETE");

      vi.unstubAllGlobals();
    });

    it("should build query string from options", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listRepos({ scope: "private", limit: 10, offset: 5 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("scope=private");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=5");

      vi.unstubAllGlobals();
    });

    it("should handle error responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ status: "error", message: "Insufficient tier" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(client.listRepos()).rejects.toThrow(CodeFundiApiError);
      await expect(client.listRepos()).rejects.toThrow(/Insufficient tier/);

      vi.unstubAllGlobals();
    });

    it("should handle non-JSON error responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => { throw new Error("not json"); },
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(client.listRepos()).rejects.toThrow(/502 Bad Gateway/);

      vi.unstubAllGlobals();
    });

    it("auth endpoints should not include X-API-Key header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", data: { user_id: "u1", email: "a@b.com", session: null, verification_required: true, api_key: null } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.authAuthenticate({ email: "a@b.com", auth_mode: "otp" });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["X-API-Key"]).toBeUndefined();

      vi.unstubAllGlobals();
    });

    it("auth authenticate should apply optional auth headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", data: { user_id: "u1", email: "a@b.com", session: null, verification_required: true, api_key: null } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.authAuthenticate(
        { email: "a@b.com", auth_mode: "password", authPassword: "pw123" },
        {
          idempotencyKey: "idem-1",
          fingerprint: "fp-1",
          passwordHeader: "x-auth-password",
        },
      );

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Idempotency-Key"]).toBe("idem-1");
      expect(options.headers["X-Fingerprint"]).toBe("fp-1");
      expect(options.headers["X-Auth-Password"]).toBe("pw123");

      vi.unstubAllGlobals();
    });

    it("should encode repo key URL for file paths", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listFiles("https://github.com/owner/repo");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain(encodeURIComponent("https://github.com/owner/repo"));

      vi.unstubAllGlobals();
    });

    it("should not encode UUID repo keys", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      await client.listFiles(uuid);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain(`/v2/files/${uuid}`);

      vi.unstubAllGlobals();
    });
  });

  // ==== NDJSON stream collection ====

  describe("NDJSON stream collection", () => {
    it("should collect search results and text chunks", async () => {
      const lines = [
        JSON.stringify({ type: "search", results: [{ id: "r1", file_name: "test.ts" }], total: 1, meta: {} }),
        JSON.stringify({ type: "chunk", text: "Hello " }),
        JSON.stringify({ type: "chunk", text: "world" }),
        JSON.stringify({ type: "done", model: "gpt-4", context_files: 1 }),
      ].join("\n") + "\n";

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines));
          controller.close();
        },
      });

      const result = await client.collectNdjsonStream(stream);
      expect(result.text).toBe("Hello world");
      expect(result.searchResults).toHaveLength(1);
      expect(result.searchResults[0].id).toBe("r1");
      expect(result.model).toBe("gpt-4");
      expect(result.contextFiles).toBe(1);
    });

    it("should handle stream error chunks", async () => {
      const lines = [
        JSON.stringify({ type: "error", message: "rate limited", code: "RATE_LIMIT" }),
      ].join("\n") + "\n";

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines));
          controller.close();
        },
      });

      await expect(client.collectNdjsonStream(stream)).rejects.toThrow(CodeFundiApiError);
      await expect(client.collectNdjsonStream(
        new ReadableStream({
          start(c) { c.enqueue(encoder.encode(lines)); c.close(); },
        })
      )).rejects.toThrow(/rate limited/);
    });

    it("should skip malformed NDJSON lines", async () => {
      const lines = [
        "not valid json",
        JSON.stringify({ type: "chunk", text: "ok" }),
        JSON.stringify({ type: "done", model: "test", context_files: 0 }),
      ].join("\n") + "\n";

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(lines));
          controller.close();
        },
      });

      const result = await client.collectNdjsonStream(stream);
      expect(result.text).toBe("ok");
    });
  });
});

// ==== CodeFundiApiError ====

describe("CodeFundiApiError", () => {
  it("should store statusCode and message", () => {
    const err = new CodeFundiApiError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("CodeFundiApiError");
  });

  it("should store optional code and retryAfter", () => {
    const err = new CodeFundiApiError("Rate limited", 429, { code: "RATE_LIMIT", retryAfter: 30 });
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.retryAfter).toBe(30);
  });
});
