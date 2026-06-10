/**
 * Code-Fundi MCP — Response Formatters
 *
 * Convert API responses into clean, LLM-readable markdown strings.
 */

import type {
  SearchResult, SearchMeta, ResearchResult, Repository,
  FileListItem, FileDocumentationData, HistoryItem,
  UsageByType, ActivityByDay, LanguageStat,
  ApiKey, AIModel, ReadmeData, RepoStatusData,
  RepositoryIndexInitRepo, Pagination, TierName,
  V2ChatResult,
} from "./types.js";
import { CodeFundiApiError } from "./client.js";

// ============================================================================
// Search
// ============================================================================

export function formatSearchResults(results: SearchResult[], meta?: SearchMeta, total?: number): string {
  const parts: string[] = [];
  parts.push(`## Search Results (${total ?? results.length} found)\n`);

  if (meta) {
    const info: string[] = [];
    if (meta.scope) info.push(`Scope: ${meta.scope}`);
    if (meta.scan_mode) info.push(`Mode: ${meta.scan_mode}`);
    if (meta.search_time_ms) info.push(`Time: ${meta.search_time_ms}ms`);
    if (meta.credits_used !== undefined) info.push(`Credits used: ${meta.credits_used}`);
    if (info.length) parts.push(info.join(" | ") + "\n");
  }

  if (results.length === 0) {
    parts.push("No results found.");
    return parts.join("\n");
  }

  for (const r of results) {
    const sim = r.similarity !== null ? ` (${(r.similarity * 100).toFixed(1)}% match)` : "";
    parts.push(`### ${r.file_name}${sim}`);
    parts.push(`- **Path:** \`${r.file_path}\``);
    parts.push(`- **Repo:** ${r.repo_name || r.repo_id}`);
    if (r.github_url) parts.push(`- **URL:** ${r.github_url}`);
    parts.push(`- **Size:** ${r.file_size_kb} KB | Branch: \`${r.file_branch}\``);
    if (r.documentation) {
      parts.push(`\n${r.documentation}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

export function formatResearchResult(result: ResearchResult): string {
  const parts: string[] = [];

  if (result.searchResults.length > 0) {
    parts.push(`## Code Context (${result.searchResults.length} files found)\n`);
    for (const r of result.searchResults) {
      const sim = r.similarity !== null ? ` ${(r.similarity * 100).toFixed(0)}%` : "";
      parts.push(`- \`${r.file_path}\` (${r.repo_name || "repo"})${sim}`);
    }
    parts.push("");
  }

  if (result.text) {
    parts.push("## AI Analysis\n");
    parts.push(result.text);
    parts.push("");
  }

  if (result.model) parts.push(`_Model: ${result.model}_`);
  if (result.contextFiles) parts.push(`_Context files: ${result.contextFiles}_`);

  return parts.join("\n");
}

export function formatV2ChatResult(result: V2ChatResult): string {
  const parts: string[] = [];
  if (result.text.trim()) {
    parts.push(result.text.trim());
  } else {
    parts.push("_No response generated._");
  }
  if (result.model) parts.push(`\n_Model: ${result.model}_`);
  if (result.conversationId) parts.push(`_Conversation: ${result.conversationId}_`);
  if (result.contextFiles !== undefined) parts.push(`_Context files: ${result.contextFiles}_`);
  if (result.searchResults?.length) {
    parts.push(`\n_Context sources: ${result.searchResults.length} file(s)._`);
  }
  return parts.join("\n");
}

// ============================================================================
// Repos
// ============================================================================

export function formatRepoList(repos: Repository[], pagination?: Pagination): string {
  const parts: string[] = [];
  parts.push(`## Repositories (${pagination?.total ?? repos.length})\n`);

  if (repos.length === 0) {
    parts.push("No repositories found.");
    return parts.join("\n");
  }

  for (const r of repos) {
    const status = r.is_updating ? "🔄 Indexing" : r.status ? "✅ Ready" : "⏸️ Inactive";
    const vis = r.is_public ? "Public" : "Private";
    parts.push(`### ${r.name} [${status}]`);
    parts.push(`- **ID:** \`${r.id}\``);
    parts.push(`- **Link:** ${r.link}`);
    parts.push(`- **Visibility:** ${vis} | Source: ${r.source}`);
    if (r.description) parts.push(`- **Description:** ${r.description}`);
    if (r.branch) parts.push(`- **Branch:** \`${r.branch}\``);
    parts.push("");
  }

  if (pagination?.has_more) {
    parts.push(`_Showing ${repos.length} of ${pagination.total}. Use offset=${pagination.offset + pagination.limit} for next page._`);
  }

  return parts.join("\n");
}

export function formatIndexResult(repo: RepositoryIndexInitRepo, message?: string): string {
  const parts: string[] = [];
  parts.push("## Repository Indexed\n");
  if (message) parts.push(`${message}\n`);
  parts.push(`- **URL:** ${repo.url}`);
  if (repo.branch) parts.push(`- **Branch:** ${repo.branch}`);
  if (repo.data_source_id) parts.push(`- **Source ID:** \`${repo.data_source_id}\``);
  if (repo.total_files !== null) parts.push(`- **Total files:** ${repo.total_files}`);
  if (repo.description) parts.push(`- **Description:** ${repo.description}`);

  if (repo.files?.index?.length) {
    parts.push(`\n### Files (${repo.files.index.length})`);
    for (const f of repo.files.index.slice(0, 20)) {
      parts.push(`- \`${f.path}\` (${f.language || f.ext})`);
    }
    if (repo.files.index.length > 20) parts.push(`_...and ${repo.files.index.length - 20} more_`);
  }
  return parts.join("\n");
}

export function formatRepoStatus(data: RepoStatusData): string {
  const status = data.updating ? "🔄 Currently indexing" : data.status ? "✅ Ready" : "⏸️ Inactive";
  const parts = [`## Repository Status: ${status}`];
  if (data.name) parts.push(`- **Name:** ${data.name}`);
  if (data.last_updated) parts.push(`- **Last updated:** ${data.last_updated}`);
  return parts.join("\n");
}

export function formatReadme(data: ReadmeData): string {
  const parts: string[] = [];
  parts.push(`## ${data.repo.name} — README\n`);
  parts.push(`- **File:** \`${data.file_path}\``);
  if (data.github_url) parts.push(`- **URL:** ${data.github_url}`);
  parts.push("");
  parts.push(data.documentation || data.data || "_No README content._");
  return parts.join("\n");
}

// ============================================================================
// Files
// ============================================================================

export function formatFileList(files: FileListItem[], pagination?: Pagination): string {
  const parts: string[] = [];
  parts.push(`## Files (${pagination?.total ?? files.length})\n`);

  if (files.length === 0) {
    parts.push("No files found.");
    return parts.join("\n");
  }

  for (const f of files) {
    const lines = f.total_lines ? ` | ${f.total_lines} lines` : "";
    parts.push(`- **\`${f.file_path}\`** (${f.file_size_kb} KB${lines}) — ID: \`${f.id}\``);
    if (f.description) parts.push(`  ${f.description}`);
  }
  parts.push("");

  if (pagination?.has_more) {
    parts.push(`_Showing ${files.length} of ${pagination.total}. Use offset=${pagination.offset + pagination.limit} for next page._`);
  }

  return parts.join("\n");
}

export function formatFileDocumentation(data: FileDocumentationData): string {
  const parts: string[] = [];
  parts.push(`## ${data.file_name} — Documentation\n`);
  parts.push(`- **Path:** \`${data.file_path}\``);
  parts.push(`- **Repo:** ${data.repo.name} (\`${data.repo_id}\`)`);
  parts.push(`- **Size:** ${data.file_size_kb} KB | Branch: \`${data.file_branch}\``);
  if (data.github_url) parts.push(`- **URL:** ${data.github_url}`);
  parts.push("");
  parts.push(data.documentation || "_No documentation available._");
  return parts.join("\n");
}

// ============================================================================
// History
// ============================================================================

export function formatHistoryList(items: HistoryItem[], pagination?: Pagination): string {
  const parts: string[] = [];
  parts.push(`## History (${pagination?.total ?? items.length})\n`);

  if (items.length === 0) {
    parts.push("No history entries found.");
    return parts.join("\n");
  }

  for (const h of items) {
    const ts = new Date(h.created_at).toLocaleString();
    const cost = h.cost_credits ? ` | ${h.cost_credits} credits` : "";
    parts.push(`### [${h.category}] ${h.prompt.slice(0, 80)}${h.prompt.length > 80 ? "..." : ""}`);
    parts.push(`- **ID:** \`${h.id}\` | ${ts}${cost}`);
    if (h.model) parts.push(`- **Model:** ${h.model}`);
    if (h.response_preview) parts.push(`- **Preview:** ${h.response_preview.slice(0, 120)}...`);
    parts.push("");
  }

  if (pagination?.has_more) {
    parts.push(`_Showing ${items.length} of ${pagination.total}. Use offset=${pagination.offset + pagination.limit} for next page._`);
  }
  return parts.join("\n");
}

export function formatHistoryDetail(item: HistoryItem): string {
  const parts: string[] = [];
  const ts = new Date(item.created_at).toLocaleString();
  parts.push(`## History Detail\n`);
  parts.push(`- **ID:** \`${item.id}\``);
  parts.push(`- **Category:** ${item.category} | **Endpoint:** ${item.endpoint || "N/A"}`);
  parts.push(`- **Date:** ${ts}`);
  if (item.model) parts.push(`- **Model:** ${item.model}`);
  parts.push(`- **Credits:** ${item.cost_credits}`);
  if (item.duration_ms) parts.push(`- **Duration:** ${item.duration_ms}ms`);
  parts.push(`\n### Prompt\n${item.prompt}`);
  if (item.response) parts.push(`\n### Response\n${item.response}`);
  if (item.retrieved_knowledge_sources?.length) {
    parts.push(`\n### Sources (${item.retrieved_knowledge_sources.length})`);
    for (const s of item.retrieved_knowledge_sources) {
      parts.push(`- \`${s.file_path || s.id}\`${s.repo_name ? ` (${s.repo_name})` : ""}`);
    }
  }
  return parts.join("\n");
}

export function formatConversation(conversationId: string, messages: HistoryItem[], count: number): string {
  const parts: string[] = [];
  parts.push(`## Conversation \`${conversationId}\` (${count} messages)\n`);
  for (const m of messages) {
    const ts = new Date(m.created_at).toLocaleString();
    parts.push(`### ${ts} [${m.category}]`);
    parts.push(`**Prompt:** ${m.prompt}`);
    if (m.response) parts.push(`**Response:** ${m.response}`);
    parts.push("");
  }
  return parts.join("\n");
}

// ============================================================================
// Stats
// ============================================================================

export function formatUsageStats(usage: UsageByType[], total: number): string {
  const parts: string[] = [];
  parts.push(`## Usage Statistics (${total} total queries)\n`);
  parts.push("| Type | Count | Credits | Avg Duration |");
  parts.push("|------|-------|---------|-------------|");
  for (const u of usage) {
    parts.push(`| ${u.query_type} | ${u.count} | ${u.cost_credits ?? 0} | ${u.avg_duration_ms ? Math.round(u.avg_duration_ms) + "ms" : "N/A"} |`);
  }
  return parts.join("\n");
}

export function formatActivityStats(activity: ActivityByDay[], total: number, activeDays: number): string {
  const parts: string[] = [];
  parts.push(`## Activity Statistics (${total} queries, ${activeDays} active days)\n`);
  parts.push("| Date | Count | Credits |");
  parts.push("|------|-------|---------|");
  for (const a of activity) {
    parts.push(`| ${a.date} | ${a.count} | ${a.cost_credits ?? 0} |`);
  }
  return parts.join("\n");
}

export function formatLanguageStats(languages: LanguageStat[], total: number): string {
  const parts: string[] = [];
  parts.push(`## Language Statistics (${total} total)\n`);
  parts.push("| Language | Count |");
  parts.push("|----------|-------|");
  for (const l of languages) {
    parts.push(`| ${l.language} | ${l.count} |`);
  }
  return parts.join("\n");
}

// ============================================================================
// Keys & Models
// ============================================================================

export function formatApiKeys(keys: ApiKey[]): string {
  const parts: string[] = [];
  parts.push(`## API Keys (${keys.length})\n`);
  for (const k of keys) {
    const status = k.status ? "✅ Active" : "❌ Disabled";
    parts.push(`- \`${k.key}\` [${status}] — ID: \`${k.id}\`, Created: ${k.created_at}`);
  }
  return parts.join("\n");
}

export function formatModels(models: AIModel[]): string {
  const parts: string[] = [];
  parts.push(`## Available Models (${models.length})\n`);
  parts.push("| Name | Provider | Tier |");
  parts.push("|------|----------|------|");
  for (const m of models) {
    const tier =
      m.tier_required
      ?? (m.tier_requirements?.premium_only ? "PRO" as TierName : "FREE" as TierName);
    parts.push(`| ${m.name} | ${m.provider} | ${tier} |`);
  }
  return parts.join("\n");
}

// ============================================================================
// Errors
// ============================================================================

export function formatError(err: unknown): string {
  if (err instanceof CodeFundiApiError) {
    let msg = `**Code-Fundi API Error (${err.statusCode}):** ${err.message}`;
    if (err.statusCode === 401) {
      msg += "\n\n_Tip: Use `code-fundi-auth-authenticate` and `code-fundi-auth-verify` to sign in, or set the CODEFUNDI_API_KEY environment variable._";
    }
    if (err.retryAfter) msg += `\n_Retry after: ${err.retryAfter}s_`;
    return msg;
  }
  if (err instanceof Error) return `**Error:** ${err.message}`;
  return `**Error:** ${String(err)}`;
}
