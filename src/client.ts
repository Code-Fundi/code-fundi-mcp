/**
 * Code-Fundi API Client
 *
 * Async fetch-based client for the Code-Fundi REST API.
 * Supports authenticated and unauthenticated endpoints, NDJSON stream collection,
 * and mutable API key (set from env or dynamically via auth flow).
 */

import type {
  SearchRequest, SearchResponse, ResearchResult, SearchResult,
  SearchMeta, NDJSONChunk, RepositoryListResponse, IndexRepoRequest,
  IndexRepoResponse, RepoStatusResponse, ReadmeResponse,
  FileListResponse, FileDocumentationResponse, HistoryListResponse,
  HistoryItemResponse, ConversationResponse, UsageStatsResponse,
  ActivityStatsResponse, LanguageStatsResponse, ApiKeysListResponse,
  ApiKeyRegenerateResponse, ApiKeyDeleteResponse, V2AuthAuthenticateResponse,
  V2AuthVerifyResponse, V2AuthResendResponse, V2AuthMode,
  ChatRequest, ChatResponse, ModelsResponse, SearchFieldsParam,
  SortOrder, StatsRange, RepoScope, HistoryCategory, ErrorResponse,
  V2AuthClientRequestOptions, V2ChatRequest, V2ChatResult,
} from "./types.js";

export const CODEFUNDI_DEFAULT_CHAT_MODEL_ID = "openai/gpt-oss-120b:free" as const;

// ============================================================================
// Error
// ============================================================================

export class CodeFundiApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly retryAfter?: number;

  constructor(message: string, statusCode: number, meta?: { code?: string; retryAfter?: number }) {
    super(message);
    this.name = "CodeFundiApiError";
    this.statusCode = statusCode;
    this.code = meta?.code;
    this.retryAfter = meta?.retryAfter;
  }
}

// ============================================================================
// Helpers
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encodeRepoKey(repoKey: string): string {
  const s = repoKey.trim();
  if (!s) return s;
  return UUID_RE.test(s) ? s : encodeURIComponent(s);
}

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.append(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// ============================================================================
// Client
// ============================================================================

export class CodeFundiClient {
  private baseUrl: string;
  private apiKey: string | null;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || "https://api.codefundi.app").replace(/\/$/, "");
    this.apiKey = apiKey || null;
  }

  getApiKey(): string | null { return this.apiKey; }
  setApiKey(key: string): void { this.apiKey = key; }
  hasApiKey(): boolean { return !!this.apiKey; }

  requireApiKey(): void {
    if (!this.apiKey) {
      throw new CodeFundiApiError(
        "No Code-Fundi API key configured. Set CODEFUNDI_API_KEY env var, or use code-fundi-auth-authenticate and code-fundi-auth-verify tools to sign in.",
        401,
      );
    }
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h["X-API-Key"] = this.apiKey;
    return h;
  }

  private async readHttpError(res: Response): Promise<{ msg: string; code?: string; retryAfter?: number }> {
    try {
      const body = (await res.json()) as ErrorResponse & { retry_after?: number };
      return {
        msg: body.message || `${res.status} ${res.statusText}`,
        code: body.code,
        retryAfter: typeof body.retry_after === "number" ? body.retry_after : undefined,
      };
    } catch {
      return { msg: `${res.status} ${res.statusText}` };
    }
  }

  private async request<T>(endpoint: string, init: RequestInit = {}, streaming = false): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...init,
      headers: { ...this.authHeaders(), ...(init.headers as Record<string, string> || {}) },
    });
    if (!res.ok) {
      const { msg, code, retryAfter } = await this.readHttpError(res);
      throw new CodeFundiApiError(msg, res.status, { code, retryAfter });
    }
    if (streaming) return res.body as T;
    return (await res.json()) as T;
  }

  /**
   * `/v1/fundi/chat` streams `text/html` (or multipart when voice/knowledge/dev-agent paths apply).
   * Collect non-JSON bodies into `response` for MCP tools.
   */
  private async parseFundiChatResponse(res: Response): Promise<ChatResponse> {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      return (await res.json()) as ChatResponse;
    }
    const text = await res.text();
    return { status: "success", response: text };
  }

  private buildV1ChatBody(req: ChatRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      question: req.prompt,
      model: req.model ?? null,
      conversation: req.conversation ?? null,
      context: req.context ?? null,
      embed: req.embed ?? false,
      voice: req.voice ?? false,
    };
    if (req.code_block !== undefined && req.code_block !== "") body.code_block = req.code_block;
    if (req.knowledge_id?.length) body.knowledge = req.knowledge_id;
    return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== null));
  }

  private mergeV2AuthClientHeaders(
    base: Record<string, string>,
    options?: V2AuthClientRequestOptions,
  ): Record<string, string> {
    const out = { ...base };
    if (options?.idempotencyKey) out["Idempotency-Key"] = options.idempotencyKey;
    if (options?.fingerprint) out["X-Fingerprint"] = options.fingerprint;
    return out;
  }

  private async postUnauth<T>(endpoint: string, body: unknown, extra?: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(extra || {}) },
      body: JSON.stringify(body),
    });
    let json: unknown;
    try { json = await res.json(); } catch { json = {}; }
    if (!res.ok) {
      const e = json as { message?: string; code?: string; retry_after?: number };
      throw new CodeFundiApiError(e.message || `${res.status} ${res.statusText}`, res.status, {
        code: e.code, retryAfter: typeof e.retry_after === "number" ? e.retry_after : undefined,
      });
    }
    return json as T;
  }

  private extractStringCandidate(...candidates: unknown[]): string | undefined {
    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return undefined;
  }

  private normalizeV2ChatJson(payload: unknown): V2ChatResult {
    if (!payload || typeof payload !== "object") {
      return { text: "", raw: payload };
    }

    const root = payload as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object")
      ? root.data as Record<string, unknown>
      : undefined;

    const text = this.extractStringCandidate(
      root.response, root.text, root.message, root.content,
      data?.response, data?.text, data?.message, data?.content,
    ) ?? "";

    const model = this.extractStringCandidate(root.model, data?.model);
    const conversationId = this.extractStringCandidate(
      root.conversation_id,
      root.conversationId,
      data?.conversation_id,
      data?.conversationId,
    );

    const searchResultsRaw =
      Array.isArray(root.search_results) ? root.search_results
      : Array.isArray(root.results) ? root.results
      : Array.isArray(data?.search_results) ? data.search_results
      : Array.isArray(data?.results) ? data.results
      : undefined;

    const searchResults = Array.isArray(searchResultsRaw)
      ? searchResultsRaw as SearchResult[]
      : undefined;

    const contextFilesRaw =
      typeof root.context_files === "number" ? root.context_files
      : typeof data?.context_files === "number" ? data.context_files
      : undefined;

    return {
      text,
      model,
      conversationId,
      contextFiles: contextFilesRaw,
      searchResults,
      raw: payload,
    };
  }

  // ---- NDJSON ----

  async collectNdjsonStream(stream: ReadableStream<Uint8Array>): Promise<ResearchResult> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "", text = "";
    let searchResults: SearchResult[] = [];
    let searchMeta: SearchMeta | undefined;
    let model: string | undefined;
    let contextFiles: number | undefined;

    const processLine = (line: string) => {
      const t = line.trim();
      if (!t) return;
      try {
        const c = JSON.parse(t) as NDJSONChunk;
        if (c.type === "search") { searchResults = c.results; searchMeta = c.meta; }
        else if (c.type === "chunk") { text += c.text; }
        else if (c.type === "done") { model = c.model; contextFiles = c.context_files; }
        else if (c.type === "error") { throw new CodeFundiApiError(c.message, 500, { code: c.code }); }
      } catch (e) { if (e instanceof CodeFundiApiError) throw e; }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const l of lines) processLine(l);
      }
      if (buffer.trim()) processLine(buffer);
    } finally { reader.releaseLock(); }

    return { text, searchResults, searchMeta, model, contextFiles };
  }

  async collectV2ChatNdjsonStream(stream: ReadableStream<Uint8Array>): Promise<V2ChatResult> {
    const research = await this.collectNdjsonStream(stream);
    return {
      text: research.text,
      model: research.model,
      contextFiles: research.contextFiles,
      searchResults: research.searchResults,
      raw: {
        searchMeta: research.searchMeta,
      },
    };
  }

  // ==== V2 Search ====

  async search(req: SearchRequest): Promise<SearchResponse> {
    this.requireApiKey();
    return this.request<SearchResponse>("/v2/search", { method: "POST", body: JSON.stringify(req) });
  }

  async searchWithChat(req: Omit<SearchRequest, "chat"> & { model?: string }): Promise<ResearchResult> {
    this.requireApiKey();
    const stream = await this.request<ReadableStream<Uint8Array>>(
      "/v2/search", { method: "POST", body: JSON.stringify({ ...req, chat: true }) }, true,
    );
    return this.collectNdjsonStream(stream);
  }

  // ==== V2 Repos ====

  async listRepos(opts: { scope?: RepoScope; search?: string | null; limit?: number; offset?: number; order_by?: string; order?: SortOrder } = {}): Promise<RepositoryListResponse> {
    this.requireApiKey();
    return this.request<RepositoryListResponse>(`/v2/repos${buildQuery(opts)}`, { method: "GET" });
  }

  async indexRepo(req: IndexRepoRequest): Promise<IndexRepoResponse> {
    this.requireApiKey();
    return this.request<IndexRepoResponse>("/v2/repos/index/new", { method: "POST", body: JSON.stringify(req) });
  }

  async getRepoStatus(url: string): Promise<RepoStatusResponse> {
    this.requireApiKey();
    return this.request<RepoStatusResponse>("/v2/repos/status", { method: "POST", body: JSON.stringify({ url }) });
  }

  async getRepoReadme(repoKey: string): Promise<ReadmeResponse> {
    this.requireApiKey();
    return this.request<ReadmeResponse>(`/v2/repos/${encodeRepoKey(repoKey)}/readme`, { method: "GET" });
  }

  // ==== V2 Files ====

  async listFiles(repoKey: string, opts: { search?: string | null; limit?: number; offset?: number; order_by?: string; order?: SortOrder } = {}): Promise<FileListResponse> {
    this.requireApiKey();
    const qs = buildQuery({ ...opts, order_by: opts.order_by ?? "file_path" });
    return this.request<FileListResponse>(`/v2/files/${encodeRepoKey(repoKey)}${qs}`, { method: "GET" });
  }

  async getFileDocumentation(repoKey: string, fileId: string, fields: SearchFieldsParam = "full"): Promise<FileDocumentationResponse> {
    this.requireApiKey();
    return this.request<FileDocumentationResponse>(`/v2/files/${encodeRepoKey(repoKey)}/${fileId}${buildQuery({ fields })}`, { method: "GET" });
  }

  // ==== V2 History ====

  async listHistory(opts: { limit?: number; offset?: number; from?: string; to?: string; endpoint?: string; query_type?: string; query_type_prefix?: string; repo_id?: string; conversation_id?: string; categories?: HistoryCategory[] } = {}): Promise<HistoryListResponse> {
    this.requireApiKey();
    const { categories, ...rest } = opts;
    const params: Record<string, unknown> = { ...rest };
    if (categories?.length) params.categories = categories.join(",");
    return this.request<HistoryListResponse>(`/v2/history${buildQuery(params)}`, { method: "GET" });
  }

  async getHistoryItem(id: string): Promise<HistoryItemResponse> {
    this.requireApiKey();
    return this.request<HistoryItemResponse>(`/v2/history/${id}`, { method: "GET" });
  }

  async getConversation(id: string): Promise<ConversationResponse> {
    this.requireApiKey();
    return this.request<ConversationResponse>(`/v2/history/conversation/${id}`, { method: "GET" });
  }

  // ==== V2 Stats ====

  async getUsageStats(range: StatsRange | string = "7d"): Promise<UsageStatsResponse> {
    this.requireApiKey();
    return this.request<UsageStatsResponse>(`/v2/stats/usage${buildQuery({ range })}`, { method: "GET" });
  }

  async getActivityStats(range: StatsRange | string = "7d"): Promise<ActivityStatsResponse> {
    this.requireApiKey();
    return this.request<ActivityStatsResponse>(`/v2/stats/activity${buildQuery({ range })}`, { method: "GET" });
  }

  async getLanguageStats(): Promise<LanguageStatsResponse> {
    this.requireApiKey();
    return this.request<LanguageStatsResponse>("/v2/stats/languages", { method: "GET" });
  }

  // ==== V2 Keys ====

  async listApiKeys(): Promise<ApiKeysListResponse> {
    this.requireApiKey();
    return this.request<ApiKeysListResponse>("/v2/keys", { method: "GET" });
  }

  async regenerateApiKey(): Promise<ApiKeyRegenerateResponse> {
    this.requireApiKey();
    return this.request<ApiKeyRegenerateResponse>("/v2/keys/regenerate", { method: "POST" });
  }

  async deleteApiKey(keyId: string): Promise<ApiKeyDeleteResponse> {
    this.requireApiKey();
    return this.request<ApiKeyDeleteResponse>(`/v2/keys/${encodeURIComponent(keyId)}`, { method: "DELETE" });
  }

  // ==== V2 Auth (unauthenticated) ====

  async authAuthenticate(
    p: {
      email: string;
      auth_mode?: V2AuthMode;
      mode?: V2AuthMode;
      should_create_user?: boolean;
      authPassword?: string;
      data?: Record<string, unknown>;
    },
    request?: V2AuthClientRequestOptions,
  ): Promise<V2AuthAuthenticateResponse> {
    const authMode = p.auth_mode ?? p.mode;
    if (!authMode) {
      throw new TypeError("authAuthenticate requires auth_mode or mode");
    }
    const passHeader =
      request?.passwordHeader === "x-auth-password"
        ? "X-Auth-Password"
        : "X-CodeFundi-Auth-Password";
    const h: Record<string, string> = {};
    if (authMode === "password" && p.authPassword) h[passHeader] = p.authPassword;
    return this.postUnauth<V2AuthAuthenticateResponse>("/v2/auth/authenticate", {
      auth_mode: authMode,
      email: p.email,
      should_create_user: p.should_create_user ?? false,
      ...(p.data ? { data: p.data } : {}),
    }, this.mergeV2AuthClientHeaders(h, request));
  }

  async authVerify(
    p: { email: string; token: string },
    request?: V2AuthClientRequestOptions,
  ): Promise<V2AuthVerifyResponse> {
    return this.postUnauth<V2AuthVerifyResponse>(
      "/v2/auth/verify",
      p,
      this.mergeV2AuthClientHeaders({}, request),
    );
  }

  async authResend(
    p: { email: string; type?: "signup" | "email_change" | "email" },
    request?: V2AuthClientRequestOptions,
  ): Promise<V2AuthResendResponse> {
    return this.postUnauth<V2AuthResendResponse>(
      "/v2/auth/resend",
      { email: p.email, type: p.type ?? "signup" },
      this.mergeV2AuthClientHeaders({}, request),
    );
  }

  // ==== V2 Chat ====

  async chatV2(
    req: V2ChatRequest,
    options?: { fallbackToV1?: boolean },
  ): Promise<V2ChatResult> {
    this.requireApiKey();
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      model: req.model ?? CODEFUNDI_DEFAULT_CHAT_MODEL_ID,
      conversation_id: req.conversation_id,
      repo_ids: req.repo_ids,
      repo_urls: req.repo_urls,
      context: req.context,
      stream: req.stream,
      ...(req.extra || {}),
    };

    const normalizedBody = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined && value !== null),
    );

    try {
      const res = await fetch(`${this.baseUrl}/v2/chat`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(normalizedBody),
      });
      if (!res.ok) {
        const { msg, code, retryAfter } = await this.readHttpError(res);
        throw new CodeFundiApiError(msg, res.status, { code, retryAfter });
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("ndjson")) {
        if (!res.body) return { text: "" };
        return this.collectV2ChatNdjsonStream(res.body);
      }
      if (ct.includes("application/json")) {
        const payload = await res.json();
        return this.normalizeV2ChatJson(payload);
      }
      const text = await res.text();
      return { text, raw: text };
    } catch (err) {
      const canFallback =
        options?.fallbackToV1 !== false &&
        err instanceof CodeFundiApiError &&
        [404, 405, 501].includes(err.statusCode);
      if (!canFallback) throw err;

      const legacy = await this.chat({
        prompt: req.prompt,
        model: req.model,
        conversation: req.conversation_id,
        context: req.context,
      });
      return {
        text: legacy.response || "",
        model: legacy.model,
        raw: legacy,
      };
    }
  }

  // ==== V1 Chat & Models (OpenAPI: AI Chat; server body uses `question`, not `prompt`) ====

  async chat(req: ChatRequest): Promise<ChatResponse> {
    this.requireApiKey();
    const url = `${this.baseUrl}/v1/fundi/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(this.buildV1ChatBody(req)),
    });
    if (!res.ok) {
      const { msg, code, retryAfter } = await this.readHttpError(res);
      throw new CodeFundiApiError(msg, res.status, { code, retryAfter });
    }
    return this.parseFundiChatResponse(res);
  }

  async getModels(): Promise<ModelsResponse> {
    this.requireApiKey();
    return this.request<ModelsResponse>("/v1/fundi/models", { method: "GET" });
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: CodeFundiClient | null = null;

export function getClient(): CodeFundiClient {
  if (!_instance) {
    _instance = new CodeFundiClient(process.env.CODEFUNDI_BASE_URL, process.env.CODEFUNDI_API_KEY);
  }
  return _instance;
}
