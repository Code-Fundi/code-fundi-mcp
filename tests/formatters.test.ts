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
  formatApiKeys, formatModels, formatError,
} from "../src/formatters.js";
import { CodeFundiApiError } from "../src/client.js";
import type {
  SearchResult, Repository, FileListItem, HistoryItem,
  FileDocumentationData, ReadmeData, RepositoryIndexInitRepo,
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
