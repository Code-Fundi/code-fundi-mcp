/**
 * Code-Fundi MCP Server — TypeScript Interfaces
 *
 * All types are translated from the official Code-Fundi TypeScript client.
 * Organized by API domain: common, search, repos, files, history, stats, auth, chat, models.
 */

// ============================================================================
// Common Types
// ============================================================================

export type TierName = "FREE" | "DEV" | "PRO" | "ENTERPRISE";

export type SearchScope = "all" | "repos" | "files" | "code" | "functions";

export type ScanMode = "semantic" | "grep_docs" | "grep_code";

export type FieldsPreset = "basic" | "summary" | "full";
export type SearchFieldsParam = FieldsPreset | string;

export type SortOrder = "asc" | "desc";

/** OpenAPI `range` for `/v2/stats/usage` and `/v2/stats/activity` (7d | 30d | 90d). */
export type StatsRange = "7d" | "30d" | "90d";

export type RepoScope = "private" | "public";

export type VisibilityFilter = "private" | "public" | "all";

export type HistoryCategory =
  | "chat"
  | "search"
  | "research"
  | "files"
  | "index"
  | "repos"
  | "history"
  | "stats"
  | "keys"
  | "models"
  | "other";

export interface Meta {
  tier?: TierName;
  updated_at?: string;
  search?: string | null;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface BaseResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
  meta?: Meta;
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination?: Pagination;
}

export interface ErrorResponse {
  status: "error";
  message: string;
  code?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchFilters {
  file_types?: string[];
  file_paths?: string[];
  dependencies?: string[];
  function_names?: string[];
  has_functions?: boolean;
  min_lines?: number;
  max_lines?: number;
  visibility?: VisibilityFilter;
}

export interface SearchRequest {
  query: string;
  scope?: SearchScope;
  scan_mode?: ScanMode;
  repo_ids?: string[];
  repo_urls?: string[];
  filters?: SearchFilters;
  similarity_threshold?: number;
  fields?: SearchFieldsParam;
  chat?: boolean;
  model?: string;
}

export type Documentation = string;

export interface SearchResult {
  id: string;
  repo_id: string;
  repo_name: string | null;
  repo_link: string | null;
  file_name: string;
  file_path: string;
  file_branch: string;
  file_size_kb: number;
  github_url: string | null;
  similarity: number | null;
  documentation?: Documentation | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SearchMeta extends Meta {
  search_time_ms?: number;
  similarity_threshold?: number;
  scope?: SearchScope;
  scan_mode?: ScanMode;
  filters_applied?: string[];
  raw_count?: number;
  filtered_count?: number;
  credits_used?: number;
  credits_remaining?: number;
  knowledge_search_length?: number;
}

export interface SearchResponse extends BaseResponse<SearchResult[]> {
  total?: number;
  meta?: SearchMeta;
}

// NDJSON Streaming Types

export interface NDJSONSearchChunk {
  type: "search";
  results: SearchResult[];
  total: number;
  meta: SearchMeta;
}

export interface NDJSONTextChunk {
  type: "chunk";
  text: string;
}

export interface NDJSONDoneChunk {
  type: "done";
  model: string;
  context_files: number;
}

export interface NDJSONErrorChunk {
  type: "error";
  message: string;
  code?: string;
}

export type NDJSONChunk =
  | NDJSONSearchChunk
  | NDJSONTextChunk
  | NDJSONDoneChunk
  | NDJSONErrorChunk;

/** Collected result from a search-with-chat (research) NDJSON stream. */
export interface ResearchResult {
  text: string;
  searchResults: SearchResult[];
  searchMeta?: SearchMeta;
  model?: string;
  contextFiles?: number;
}

// ============================================================================
// Repository Types
// ============================================================================

export interface Repository {
  id: string;
  name: string;
  link: string;
  source: string;
  description?: string | null;
  branch?: string;
  is_updating?: boolean;
  status?: boolean;
  is_public?: boolean;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface RepositoryListMeta extends Meta {
  scope?: RepoScope;
  max_repos_allowed?: number;
}

export interface RepositoryListResponse extends PaginatedResponse<Repository> {
  meta?: RepositoryListMeta;
}

export interface IndexRepoRequest {
  url: string;
  branch?: string;
  update?: boolean;
}

export interface RepoIndexFileEntry {
  path: string;
  name: string;
  ext: string;
  language?: string | null;
  sizeBytes?: number | null;
  modifiedAt?: string | null;
}

export interface RepositoryIndexInitRepo {
  url: string;
  branch: string | null;
  data_source_id: string | null;
  total_files: number | null;
  description: string | null;
  files: {
    tree: Record<string, unknown> | null;
    index: RepoIndexFileEntry[];
  };
}

export interface RepositoryIndexInitData {
  repo: RepositoryIndexInitRepo;
}

export interface IndexRepoResponse extends BaseResponse<RepositoryIndexInitData> {
  message?: string;
}

export interface RepoStatusData {
  updating: boolean;
  status: boolean;
  name?: string;
  last_updated?: string;
}

export interface RepoStatusResponse extends BaseResponse<RepoStatusData> {}

export interface ReadmeRepo {
  id: string;
  name: string;
  description?: string | null;
  link: string;
}

export interface ReadmeData {
  id: string;
  file_name: string;
  file_path: string;
  github_url: string;
  repo: ReadmeRepo;
  documentation: Documentation;
  data: string;
  created_at: string;
  updated_at?: string | null;
}

export interface ReadmeResponse extends BaseResponse<ReadmeData> {}

// ============================================================================
// File Types
// ============================================================================

export interface FileListItem {
  id: string;
  file_name: string;
  file_path: string;
  file_branch: string;
  file_size_kb: number;
  description?: string | null;
  dependencies?: string[];
  total_lines?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface FileListResponse extends PaginatedResponse<FileListItem> {}

export interface FileRepo {
  id: string;
  name: string;
  link: string;
  description?: string | null;
}

export interface FileDocumentationData {
  id: string;
  repo_id: string;
  file_name: string;
  file_path: string;
  file_branch: string;
  file_size_kb: number;
  github_url: string;
  repo: FileRepo;
  documentation: Documentation;
  created_at: string;
  updated_at?: string | null;
}

export interface FileDocumentationMeta extends Meta {
  fields_applied?: string;
}

export interface FileDocumentationResponse extends BaseResponse<FileDocumentationData> {
  meta?: FileDocumentationMeta;
}

// ============================================================================
// History Types
// ============================================================================

export interface HistorySourceFile {
  id: string;
  file_name?: string | null;
  file_path?: string | null;
  file_branch?: string | null;
  file_size_kb?: number | null;
  description?: string | null;
  dependencies?: string[];
  total_lines?: number | null;
  repo_id?: string | null;
  repo_link?: string | null;
  repo_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  query_type: string | null;
  endpoint: string | null;
  category: HistoryCategory;
  mode: string | null;
  language?: string | null;
  model: string | null;
  conversation_id?: string | null;
  repo_id?: string | null;
  organization_id?: string | null;
  cost_credits: number;
  duration_ms: number | null;
  status_code: number | null;
  retrieved_knowledge_sources: HistorySourceFile[];
  created_at: string;
  response_preview?: string | null;
  response?: string | null;
}

export interface HistoryListMeta extends Meta {
  date_range?: { from: string; to: string };
  date_range_limited?: boolean;
  upgrade_message?: string;
  max_days_allowed?: number;
  filters_applied?: {
    endpoint: string | null;
    query_type: string | null;
    query_type_prefix: string | null;
    repo_id: string | null;
    conversation_id: string | null;
    categories: string[] | null;
  };
  warning?: string;
}

export interface HistoryListResponse extends PaginatedResponse<HistoryItem> {
  meta?: HistoryListMeta;
}

export interface HistoryItemDetail extends HistoryItem {
  search_params?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface HistoryItemResponse extends BaseResponse<HistoryItemDetail> {}

export interface ConversationData {
  conversation_id: string;
  messages: HistoryItem[];
  message_count: number;
}

export interface ConversationResponse extends BaseResponse<ConversationData> {}

// ============================================================================
// Statistics Types
// ============================================================================

export interface UsageByType {
  query_type: string;
  count: number;
  category?: string;
  mode?: string | null;
  cost_credits?: number;
  avg_duration_ms?: number;
  error_count?: number;
}

export interface UsageCategoryAggregate {
  category: string;
  count: number;
  cost_credits?: number;
}

export interface UsageStatsData {
  usage_by_type: UsageByType[];
  usage_by_category?: UsageCategoryAggregate[];
  total_queries: number;
  total_cost_credits?: number;
  error_count?: number;
}

export interface UsageStatsMeta extends Meta {
  range_applied?: string;
  date_range?: { from: string; to: string };
  range_limited?: boolean;
  upgrade_message?: string;
}

export interface UsageStatsResponse extends BaseResponse<UsageStatsData> {
  meta?: UsageStatsMeta;
}

export interface ActivityByDay {
  date: string;
  count: number;
  cost_credits?: number;
  error_count?: number;
}

export interface ActivityStatsData {
  activity_by_day: ActivityByDay[];
  total_queries: number;
  active_days: number;
}

export interface ActivityStatsMeta extends Meta {
  range_applied?: string;
  date_range?: { from: string; to: string };
  range_limited?: boolean;
  upgrade_message?: string;
}

export interface ActivityStatsResponse extends BaseResponse<ActivityStatsData> {
  meta?: ActivityStatsMeta;
}

export interface LanguageStat {
  language: string;
  count: number | string;
}

export interface LanguageStatsData {
  languages: LanguageStat[];
  total_queries: number;
}

export interface LanguageStatsResponse extends BaseResponse<LanguageStatsData> {}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKey {
  id: string;
  key: string;
  name?: string | null;
  status: boolean;
  created_at: string;
}

export interface ApiKeysListResponse extends BaseResponse<ApiKey[]> {}

export interface ApiKeyRegenerateData {
  id: string;
  key: string;
  name?: string | null;
  created_at: string;
}

export interface ApiKeyRegenerateResponse extends BaseResponse<ApiKeyRegenerateData> {
  message?: string;
}

export interface ApiKeyDeleteData {
  id?: string;
  deleted?: boolean;
}

export interface ApiKeyDeleteResponse extends BaseResponse<ApiKeyDeleteData> {}

// ============================================================================
// V2 Auth Types
// ============================================================================

export type V2AuthMode = "otp" | "password";

export type V2AuthKeyState = "active" | "agent_pending";

export interface V2AuthApiKeySummary {
  key: string;
  key_state: V2AuthKeyState;
}

export interface V2AuthSessionEnvelope {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
  [key: string]: unknown;
}

export interface V2AuthAuthenticateData {
  user_id: string;
  email: string;
  session: V2AuthSessionEnvelope | null;
  verification_required: boolean;
  api_key: V2AuthApiKeySummary | null;
}

export interface V2AuthAuthenticateResponse {
  status: "ok";
  data: V2AuthAuthenticateData;
}

export interface V2AuthVerifyData {
  user_id: string;
  email: string;
  session: V2AuthSessionEnvelope;
  api_key: V2AuthApiKeySummary | null;
}

export interface V2AuthVerifyResponse {
  status: "ok";
  data: V2AuthVerifyData;
}

export interface V2AuthResendResponse {
  status: "ok";
  data: Record<string, unknown>;
}

// ============================================================================
// V1 Chat Types (no V2 equivalent)
// ============================================================================

export interface ChatContext {
  role?: "user" | "assistant" | "system";
  content?: string;
  [key: string]: unknown;
}

/**
 * Fundi chat request (MCP-facing). Serialized to `/v1/fundi/chat` as the server expects
 * `question` (and optional `code_block`, `knowledge`, etc.).
 */
export interface ChatRequest {
  /** User message (sent as `question` to the API). */
  prompt: string;
  model?: string;
  embed?: boolean;
  context?: ChatContext[];
  voice?: boolean;
  conversation?: string;
  /** Optional highlighted code; combined with `prompt` on the server. */
  code_block?: string;
  /** Repository / data-source IDs for indexed knowledge context (`knowledge` in API body). */
  knowledge_id?: string[];
}

export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface ChatResponse extends BaseResponse {
  response?: string;
  model?: string;
  usage?: ChatUsage;
}

// ============================================================================
// V1 Models Types (no V2 equivalent)
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  /** Present on normalized MCP catalog entries. */
  tier_required?: TierName;
  /** Raw `/v1/fundi/models` entries from OpenRouter catalog mapping. */
  tier_requirements?: {
    premium_only?: boolean;
    default_model?: boolean;
    preview_mode?: unknown;
  };
  context_length?: number;
}

export interface ModelsResponse {
  models: AIModel[];
}
