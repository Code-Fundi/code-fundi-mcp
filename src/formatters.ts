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
  PublicRepoListItem,
  RepoMapData, RepoBlueprintData, RepoBlueprintMeta,
  RepoRadiusData,
  ModelLimitsData,
} from "./types.js";
import { CodeFundiApiError } from "./client.js";

// ============================================================================
// Internal helpers
// ============================================================================

/** Render an opaque JSON value as a fenced code block for faithful display. */
function jsonBlock(value: unknown): string {
  return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
}

/** Read a string field from a loosely-typed record, if present. */
function readString(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = obj?.[key];
  return typeof v === "string" ? v : undefined;
}

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

export function formatPublicRepoList(repos: PublicRepoListItem[], pagination?: Pagination): string {
  const parts: string[] = [];
  parts.push(`## Public Repositories (${pagination?.total ?? repos.length})\n`);

  if (repos.length === 0) {
    parts.push("No public repositories found.");
    return parts.join("\n");
  }

  for (const r of repos) {
    parts.push(`### ${r.name}`);
    parts.push(`- **ID:** \`${r.id}\``);
    parts.push(`- **Link:** ${r.link}`);
    if (r.updated_at) parts.push(`- **Updated:** ${r.updated_at}`);
    if (r.top_files?.length) {
      parts.push(`- **Top files:**`);
      for (const f of r.top_files) {
        const size = f.file_size_kb != null ? ` (${f.file_size_kb} KB)` : "";
        parts.push(`  - \`${f.file_path}\`${size}`);
      }
    }
    parts.push("");
  }

  if (pagination?.has_more) {
    parts.push(`_Showing ${repos.length} of ${pagination.total}. Use offset=${pagination.offset + pagination.limit} for next page._`);
  }

  return parts.join("\n");
}

// ============================================================================
// Repository Intelligence (map, blueprint, radius)
// ============================================================================

export function formatRepoMap(data: RepoMapData): string {
  const parts: string[] = [];
  const srcName = readString(data.source_repo, "name");
  parts.push(`## Cross-Repository Dependency Map${srcName ? `: ${srcName}` : ""}\n`);

  if (data.scope && Object.keys(data.scope).length) {
    parts.push("### Scope");
    parts.push(jsonBlock(data.scope));
    parts.push("");
  }

  const deps = data.dependencies ?? [];
  if (!deps.length) {
    parts.push("No dependency map entries found.");
    return parts.join("\n");
  }

  parts.push(`### Dependencies (${deps.length})`);
  for (const d of deps) {
    const name = readString(d, "name") ?? "(unnamed)";
    const type = readString(d, "type");
    parts.push(`- **${name}**${type ? ` [${type}]` : ""}`);
    const repos = Array.isArray(d.repos) ? d.repos : undefined;
    if (repos?.length) parts.push(`  - Present in ${repos.length} repo(s)`);
  }

  return parts.join("\n");
}

export function formatRepoBlueprint(data: RepoBlueprintData, meta?: RepoBlueprintMeta): string {
  const parts: string[] = [];
  const name = data.repo?.name ?? data.file_name ?? "Repository";
  parts.push(`## ${name} — Blueprint\n`);
  if (meta?.deprecated) {
    parts.push("_Note: the `/readme` endpoint is deprecated; prefer `code-fundi-repo-blueprint`._\n");
  }
  if (data.github_url) parts.push(`- **URL:** ${data.github_url}`);

  const deps = data.dependencies ?? [];
  if (deps.length) {
    parts.push(`\n### Top Dependencies (${deps.length})`);
    for (const d of deps.slice(0, 25)) {
      const ver = d.version ? `@${d.version}` : "";
      const typ = d.type ? ` [${d.type}]` : "";
      const usage = d.usage?.file_count !== undefined ? ` — ${d.usage.file_count} file(s)` : "";
      parts.push(`- **${d.name}**${ver}${typ}${usage}`);
    }
    if (deps.length > 25) parts.push(`_...and ${deps.length - 25} more_`);
  }

  const tf = data.symbols?.top_functions ?? [];
  if (tf.length) {
    parts.push(`\n### Top Functions (${tf.length})`);
    for (const f of tf.slice(0, 25)) parts.push(`- \`${f.name}\`${f.type ? ` [${f.type}]` : ""}`);
  }

  const tv = data.symbols?.top_variables ?? [];
  if (tv.length) {
    parts.push(`\n### Top Variables (${tv.length})`);
    for (const v of tv.slice(0, 25)) parts.push(`- \`${v.name}\`${v.type ? ` [${v.type}]` : ""}`);
  }

  if (data.conventions && Object.keys(data.conventions).length) {
    parts.push(`\n### Coding Conventions`);
    parts.push(jsonBlock(data.conventions));
  } else if (meta?.conventions_tier_gated) {
    parts.push(`\n_Coding conventions require PRO tier or higher._`);
  }

  if (data.documentation) {
    parts.push(`\n### README\n`);
    parts.push(data.documentation);
  }

  return parts.join("\n");
}

export function formatRepoRadius(data: RepoRadiusData): string {
  const parts: string[] = [];
  parts.push("## Blast Radius Analysis\n");

  if (data.summary && Object.keys(data.summary).length) {
    parts.push("### Summary");
    parts.push(jsonBlock(data.summary));
    parts.push("");
  }

  const targets = data.targets ?? [];
  if (!targets.length) {
    parts.push("No impact targets found.");
    return parts.join("\n");
  }

  targets.forEach((t, i) => {
    parts.push(`### Target ${i + 1}`);
    if (t.entry_points?.length) parts.push(`- **Entry points:** ${t.entry_points.join(", ")}`);
    if (t.data_flows?.length) {
      parts.push(`- **Data flows (${t.data_flows.length}):**`);
      for (const f of t.data_flows) {
        parts.push(`  - ${f.source_kind ?? "?"} → ${f.sink_kind ?? "?"} (risk: ${f.risk_level ?? "n/a"})`);
      }
    }
    if (t.call_edges?.length) {
      parts.push(`- **Call edges (${t.call_edges.length}):**`);
      for (const e of t.call_edges) {
        parts.push(`  - ${e.caller ?? "?"} → ${e.callee ?? "?"}${e.call_type ? ` (${e.call_type})` : ""}`);
      }
    }
    if (t.admin_enrichment && Object.keys(t.admin_enrichment).length) {
      parts.push(`- **Admin enrichment:**`);
      parts.push(jsonBlock(t.admin_enrichment));
    }
    parts.push("");
  });

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
  parts.push("| Name | Provider | Tier | Context |");
  parts.push("|------|----------|------|---------|");
  for (const m of models) {
    const tier =
      m.tier_required
      ?? (m.tier_requirements?.premium_only ? "PRO" as TierName : "FREE" as TierName);
    const ctx = m.context_length != null ? m.context_length.toLocaleString() : "—";
    parts.push(`| ${m.name} | ${m.provider} | ${tier} | ${ctx} |`);
  }
  return parts.join("\n");
}

export function formatModelLimits(data: ModelLimitsData): string {
  const parts: string[] = [];
  parts.push(`## Model Limits & Tier${data.tier ? `: ${data.tier}` : ""}\n`);

  const sub = data.subscription;
  if (sub) {
    const info: string[] = [];
    if (sub.tokens !== undefined) info.push(`Tokens: ${sub.tokens}`);
    if (sub.bonus_tokens !== undefined) info.push(`Bonus: ${sub.bonus_tokens}`);
    if (sub.expiry_date) info.push(`Expires: ${sub.expiry_date}`);
    if (info.length) parts.push(`**Subscription:** ${info.join(" | ")}`);
  }

  const m = data.model;
  if (m) {
    parts.push(`\n### Active Model`);
    if (m.name) parts.push(`- **Name:** ${m.name}${m.provider ? ` (${m.provider})` : ""}`);
    if (m.max_tokens !== undefined) parts.push(`- **Max tokens:** ${m.max_tokens}`);
    if (m.context_length !== undefined) parts.push(`- **Context length:** ${m.context_length}`);
    if (m.vector_search_length !== undefined) parts.push(`- **Vector search length:** ${m.vector_search_length}`);
    if (m.knowledge_search_length !== undefined) parts.push(`- **Knowledge search length:** ${m.knowledge_search_length}`);
    if (m.knowledge_storage_limit !== undefined) parts.push(`- **Knowledge storage limit:** ${m.knowledge_storage_limit}`);
  }

  const l = data.limits;
  if (l) {
    parts.push(`\n### Limits`);
    if (l.history_days !== undefined) parts.push(`- **History days:** ${l.history_days}`);
    if (l.history_max_records !== undefined) parts.push(`- **History max records:** ${l.history_max_records}`);
    if (l.repos_max !== undefined) parts.push(`- **Max repos:** ${l.repos_max}`);
    if (l.files_per_repo_max !== undefined) parts.push(`- **Files per repo:** ${l.files_per_repo_max}`);
    if (l.stats_range_max_days !== undefined) parts.push(`- **Stats range max days:** ${l.stats_range_max_days}`);
    if (l.can_access_org_repos !== undefined) parts.push(`- **Can access org repos:** ${l.can_access_org_repos}`);
    if (l.can_share_to_org !== undefined) parts.push(`- **Can share to org:** ${l.can_share_to_org}`);
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
      msg += "\n\n_Tip: Use `code-fundi-auth-authenticate` and `code-fundi-auth-verify` to sign in, or set the CODEFUNDI_API_KEY environment variable. After auth, persist the key in MCP config so future sessions stay signed in._";
    }
    if (err.retryAfter) msg += `\n_Retry after: ${err.retryAfter}s_`;
    return msg;
  }
  if (err instanceof Error) return `**Error:** ${err.message}`;
  return `**Error:** ${String(err)}`;
}
