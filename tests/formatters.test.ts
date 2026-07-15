/**
 * Tests for response formatters
 */

import { describe, it, expect } from "vitest";
import {
  formatSearchResults, formatResearchResult, formatRepoList,
  formatIndexResult, formatRepoStatus, formatReadme,
  formatFileList, formatFileDocumentation, formatHistoryList,
  formatHistoryDetail, formatConversation,
  formatUsageStats, formatActivityStats, formatLanguageStats,
  formatApiKeys, formatModels, formatModelLimits, formatError,
  formatPublicRepoList, formatRepoScope, formatRepoMap,
  formatRepoBlueprint, formatRepoRadius, formatRepoReview,
  formatRepoTestGaps,
} from "../src/formatters.js";
import { CodeFundiApiError } from "../src/client.js";
import type {
  SearchResult, Repository, FileListItem, HistoryItem,
  FileDocumentationData, ReadmeData, RepositoryIndexInitRepo,
  PublicRepoListItem, RepoScopeData, RepoMapData, RepoBlueprintData,
  RepoRadiusData, RepoReviewData, RepoTestGapsData, ModelLimitsData,
} from "../src/types.js";

// ==== Search ====

describe("formatSearchResults", () => {
  it("should format empty results", () => {
    const result = formatSearchResults([], undefined, 0);
    expect(result).toContain("0 found");
    expect(result).toContain("No results found");
  });

  it("should format results with similarity scores", () => {
    const results: SearchResult[] = [{
      id: "1", repo_id: "r1", repo_name: "my-repo", repo_link: null,
      file_name: "index.ts", file_path: "src/index.ts", file_branch: "main",
      file_size_kb: 5, github_url: "https://github.com/test/repo/blob/main/src/index.ts",
      similarity: 0.95, documentation: "Entry point", created_at: "2025-01-01",
    }];
    const result = formatSearchResults(results, { search_time_ms: 42, scope: "all", scan_mode: "semantic" }, 1);
    expect(result).toContain("1 found");
    expect(result).toContain("95.0% match");
    expect(result).toContain("index.ts");
    expect(result).toContain("src/index.ts");
    expect(result).toContain("my-repo");
    expect(result).toContain("42ms");
    expect(result).toContain("Entry point");
  });

  it("should handle null similarity (grep mode)", () => {
    const results: SearchResult[] = [{
      id: "1", repo_id: "r1", repo_name: null, repo_link: null,
      file_name: "test.py", file_path: "test.py", file_branch: "main",
      file_size_kb: 2, github_url: null, similarity: null, created_at: "2025-01-01",
    }];
    const result = formatSearchResults(results);
    expect(result).not.toContain("% match");
    expect(result).toContain("test.py");
  });
});

describe("formatResearchResult", () => {
  it("should format research with search results and AI text", () => {
    const result = formatResearchResult({
      text: "Based on the code analysis...",
      searchResults: [{
        id: "1", repo_id: "r1", repo_name: "test-repo", repo_link: null,
        file_name: "app.ts", file_path: "src/app.ts", file_branch: "main",
        file_size_kb: 10, github_url: null, similarity: 0.88, created_at: "2025-01-01",
      }],
      model: "gpt-4o",
      contextFiles: 1,
    });
    expect(result).toContain("Code Context");
    expect(result).toContain("src/app.ts");
    expect(result).toContain("AI Analysis");
    expect(result).toContain("Based on the code analysis");
    expect(result).toContain("gpt-4o");
  });

  it("should handle empty research result", () => {
    const result = formatResearchResult({ text: "", searchResults: [] });
    expect(result).toBe("");
  });
});

// ==== Repos ====

describe("formatRepoList", () => {
  it("should format empty list", () => {
    const result = formatRepoList([]);
    expect(result).toContain("No repositories found");
  });

  it("should format repos with status indicators", () => {
    const repos: Repository[] = [{
      id: "r1", name: "my-repo", link: "https://github.com/me/my-repo",
      source: "github", description: "A test repo", branch: "main",
      is_updating: false, status: true, is_public: false, created_at: "2025-01-01",
    }];
    const result = formatRepoList(repos);
    expect(result).toContain("my-repo");
    expect(result).toContain("✅ Ready");
    expect(result).toContain("Private");
    expect(result).toContain("r1");
  });

  it("should show pagination info", () => {
    const repos: Repository[] = [{
      id: "r1", name: "repo", link: "url", source: "github",
      created_at: "2025-01-01", status: true,
    }];
    const result = formatRepoList(repos, { total: 50, limit: 10, offset: 0, has_more: true });
    expect(result).toContain("offset=10");
    expect(result).toContain("50");
  });
});

describe("formatRepoStatus", () => {
  it("should show updating status", () => {
    const result = formatRepoStatus({ updating: true, status: true, name: "test-repo" });
    expect(result).toContain("🔄 Currently indexing");
    expect(result).toContain("test-repo");
  });

  it("should show ready status", () => {
    const result = formatRepoStatus({ updating: false, status: true });
    expect(result).toContain("✅ Ready");
  });
});

// ==== Files ====

describe("formatFileList", () => {
  it("should format file list", () => {
    const files: FileListItem[] = [{
      id: "f1", file_name: "index.ts", file_path: "src/index.ts",
      file_branch: "main", file_size_kb: 3, total_lines: 100,
      created_at: "2025-01-01",
    }];
    const result = formatFileList(files);
    expect(result).toContain("src/index.ts");
    expect(result).toContain("3 KB");
    expect(result).toContain("100 lines");
    expect(result).toContain("f1");
  });
});

// ==== History ====

describe("formatHistoryList", () => {
  it("should format empty history", () => {
    const result = formatHistoryList([]);
    expect(result).toContain("No history entries found");
  });

  it("should format history items", () => {
    const items: HistoryItem[] = [{
      id: "h1", prompt: "How does auth work?", query_type: "search:semantic",
      endpoint: "v2.search", category: "search", mode: null, model: "gpt-4",
      cost_credits: 2, duration_ms: 500, status_code: 200,
      retrieved_knowledge_sources: [], created_at: "2025-06-15T10:00:00Z",
    }];
    const result = formatHistoryList(items);
    expect(result).toContain("[search]");
    expect(result).toContain("How does auth work?");
    expect(result).toContain("gpt-4");
    expect(result).toContain("h1");
  });
});

// ==== Stats ====

describe("formatUsageStats", () => {
  it("should format usage table", () => {
    const result = formatUsageStats(
      [{ query_type: "search:semantic", count: 42, cost_credits: 10, avg_duration_ms: 250 }],
      42,
    );
    expect(result).toContain("42 total queries");
    expect(result).toContain("search:semantic");
    expect(result).toContain("250ms");
  });
});

describe("formatLanguageStats", () => {
  it("should format language table", () => {
    const result = formatLanguageStats(
      [{ language: "TypeScript", count: 100 }, { language: "Python", count: 50 }],
      150,
    );
    expect(result).toContain("TypeScript");
    expect(result).toContain("100");
    expect(result).toContain("Python");
  });
});

// ==== Keys & Models ====

describe("formatApiKeys", () => {
  it("should format key list", () => {
    const result = formatApiKeys([
      { id: "k1", key: "cf_****abc", status: true, created_at: "2025-01-01" },
      { id: "k2", key: "cf_****xyz", status: false, created_at: "2025-01-02" },
    ]);
    expect(result).toContain("✅ Active");
    expect(result).toContain("❌ Disabled");
    expect(result).toContain("cf_****abc");
  });
});

describe("formatModels", () => {
  it("should format models table", () => {
    const result = formatModels([
      { id: "gpt-4", name: "GPT-4", provider: "openai", tier_required: "PRO" },
    ]);
    expect(result).toContain("GPT-4");
    expect(result).toContain("openai");
    expect(result).toContain("PRO");
  });

  it("should derive tier from tier_requirements when tier_required is absent", () => {
    const result = formatModels([
      {
        id: "m1",
        name: "Model",
        provider: "openai",
        tier_requirements: { premium_only: true },
      },
    ]);
    expect(result).toContain("PRO");
  });
});

describe("formatModelLimits", () => {
  it("should format tier, subscription, model, and limits", () => {
    const data: ModelLimitsData = {
      tier: "PRO",
      subscription: { tokens: 100000, bonus_tokens: 5000, expiry_date: "2026-12-31T00:00:00Z" },
      model: { name: "GPT-4o", provider: "openai", max_tokens: 4096, context_length: 128000 },
      limits: { repos_max: 50, files_per_repo_max: 2000, history_days: 90, can_share_to_org: true },
    };
    const result = formatModelLimits(data);
    expect(result).toContain("PRO");
    expect(result).toContain("100000");
    expect(result).toContain("GPT-4o");
    expect(result).toContain("Max repos:** 50");
    expect(result).toContain("Can share to org:** true");
  });
});

// ==== Public Repos ====

describe("formatPublicRepoList", () => {
  it("should format empty catalog", () => {
    const result = formatPublicRepoList([]);
    expect(result).toContain("No public repositories found");
  });

  it("should format public repos with top files", () => {
    const repos: PublicRepoListItem[] = [{
      id: "p1", name: "public-repo", link: "https://github.com/org/public-repo",
      updated_at: "2026-01-01T00:00:00Z",
      top_files: [{ id: "f1", file_name: "index.ts", file_path: "src/index.ts", file_size_kb: 12 }],
    }];
    const result = formatPublicRepoList(repos, { total: 1, limit: 100, offset: 0, has_more: false });
    expect(result).toContain("public-repo");
    expect(result).toContain("p1");
    expect(result).toContain("src/index.ts");
    expect(result).toContain("12 KB");
  });
});

// ==== Repository Intelligence ====

describe("formatRepoScope", () => {
  it("should format dependencies, functions, variables and pagination hints", () => {
    const data: RepoScopeData = {
      repo: { name: "my-repo" },
      summary: { total_files: 100, dependency_count: 3, function_count: 2, variable_count: 1 },
      scope: {
        dependencies: [{ name: "express", version: "4.18.0", type: "package", usage: { file_count: 10, percentage: 25 } }],
        functions: [{ name: "handler", type: "function", usage: { file_count: 4 } }],
        variables: [{ name: "PORT", type: "env" }],
      },
    };
    const result = formatRepoScope(data, { dependencies: { total: 20, limit: 1, offset: 0, has_more: true } }, ["variables"]);
    expect(result).toContain("my-repo");
    expect(result).toContain("**express**@4.18.0");
    expect(result).toContain("used in 10 file(s)");
    expect(result).toContain("handler");
    expect(result).toContain("PORT");
    expect(result).toContain("Gated");
    expect(result).toContain("More available");
  });

  it("should handle empty scope", () => {
    const result = formatRepoScope({ scope: {} });
    expect(result).toContain("No scope data found");
  });
});

describe("formatRepoMap", () => {
  it("should format map dependencies", () => {
    const data: RepoMapData = {
      source_repo: { name: "core" },
      dependencies: [{ name: "lodash", type: "package", repos: [{ id: "r1" }, { id: "r2" }] }],
    };
    const result = formatRepoMap(data);
    expect(result).toContain("core");
    expect(result).toContain("lodash");
    expect(result).toContain("Present in 2 repo(s)");
  });

  it("should handle empty map", () => {
    const result = formatRepoMap({ dependencies: [] });
    expect(result).toContain("No dependency map entries found");
  });
});

describe("formatRepoBlueprint", () => {
  it("should format dependencies, symbols, conventions gating, and README", () => {
    const data: RepoBlueprintData = {
      file_name: "README.md",
      github_url: "https://github.com/org/repo",
      repo: { name: "repo" },
      documentation: "# My Project",
      dependencies: [{ name: "react", version: "18.0.0", type: "package", usage: { file_count: 30 } }],
      symbols: { top_functions: [{ name: "main" }], top_variables: [{ name: "config" }] },
      conventions: null,
    };
    const result = formatRepoBlueprint(data, { conventions_tier_gated: true });
    expect(result).toContain("repo — Blueprint");
    expect(result).toContain("**react**@18.0.0");
    expect(result).toContain("main");
    expect(result).toContain("config");
    expect(result).toContain("require PRO tier");
    expect(result).toContain("# My Project");
  });

  it("should note deprecation when meta.deprecated is set", () => {
    const result = formatRepoBlueprint({ repo: { name: "repo" } }, { deprecated: true });
    expect(result).toContain("deprecated");
  });
});

describe("formatRepoRadius", () => {
  it("should format targets with data flows and call edges", () => {
    const data: RepoRadiusData = {
      summary: { impacted_files: 3 },
      targets: [{
        entry_points: ["src/server.ts"],
        data_flows: [{ source_kind: "http_input", sink_kind: "filesystem", risk_level: "high" }],
        call_edges: [{ caller: "handler", callee: "writeFile", call_type: "direct" }],
      }],
    };
    const result = formatRepoRadius(data);
    expect(result).toContain("Blast Radius Analysis");
    expect(result).toContain("src/server.ts");
    expect(result).toContain("http_input → filesystem");
    expect(result).toContain("handler → writeFile");
  });

  it("should handle no targets", () => {
    const result = formatRepoRadius({ targets: [] });
    expect(result).toContain("No impact targets found");
  });
});

describe("formatRepoReview", () => {
  it("should format the file metrics table", () => {
    const data: RepoReviewData = {
      summary: { blockers: 1 },
      files: [{
        id: "rf1", file_path: "src/app.ts", verdict: "block", risk_score: 0.9,
        cyclomatic_complexity: 22, estimated_coverage: null, technical_debt_minutes: 120,
      }],
    };
    const result = formatRepoReview(data);
    expect(result).toContain("Code Review Signals");
    expect(result).toContain("src/app.ts");
    expect(result).toContain("block");
    expect(result).toContain("N/A");
    expect(result).toContain("120");
  });

  it("should handle no files", () => {
    const result = formatRepoReview({ files: [] });
    expect(result).toContain("No review signals found");
  });
});

describe("formatRepoTestGaps", () => {
  it("should format gaps with suggested test cases", () => {
    const data: RepoTestGapsData = {
      gaps: [{
        id: "g1", file_path: "src/auth.ts", risk_score: 0.8, estimated_coverage: 0.2,
        security_risk_level: "high",
        suggested_test_cases: [{ priority: "high", description: "Test invalid token", target_function: "verify" }],
        mockable_dependencies: ["jwt"],
        hard_to_test_reasons: ["network calls"],
      }],
    };
    const result = formatRepoTestGaps(data);
    expect(result).toContain("Test Coverage Gaps");
    expect(result).toContain("src/auth.ts");
    expect(result).toContain("Test invalid token");
    expect(result).toContain("verify");
    expect(result).toContain("jwt");
    expect(result).toContain("network calls");
  });

  it("should handle no gaps", () => {
    const result = formatRepoTestGaps({ gaps: [] });
    expect(result).toContain("No test gaps found");
  });
});

// ==== Errors ====

describe("formatError", () => {
  it("should format CodeFundiApiError with auth hint", () => {
    const err = new CodeFundiApiError("Unauthorized", 401);
    const result = formatError(err);
    expect(result).toContain("401");
    expect(result).toContain("code-fundi-auth-authenticate");
  });

  it("should format rate limit error with retry info", () => {
    const err = new CodeFundiApiError("Too many requests", 429, { retryAfter: 60 });
    const result = formatError(err);
    expect(result).toContain("429");
    expect(result).toContain("60s");
  });

  it("should format generic errors", () => {
    const result = formatError(new Error("something broke"));
    expect(result).toContain("something broke");
  });

  it("should format non-Error values", () => {
    const result = formatError("raw string error");
    expect(result).toContain("raw string error");
  });
});
