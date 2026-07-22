/**
 * Code-Fundi MCP — Repository Tools
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import {
  formatRepoList, formatIndexResult, formatRepoStatus,
  formatReadme, formatPublicRepoList, formatError,
} from "../formatters.js";

export function registerRepoTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-list-repos",
    description:
      "List all indexed repositories in your Code-Fundi account. " +
      "Supports pagination, scope filtering (private/public), and name search.",
    parameters: z.object({
      scope: z.enum(["private", "public"]).optional().describe("Filter by repository visibility"),
      search: z.string().optional().describe("Case-insensitive substring filter on repo name"),
      limit: z.number().min(1).max(100).optional().describe("Max results per page (default 25)"),
      offset: z.number().min(0).optional().describe("Pagination offset"),
      order_by: z.string().optional().describe("Field to sort by"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    }),
    annotations: { title: "List Repositories", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.listRepos(args);
        return formatRepoList(res.data || [], res.pagination);
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-index-repo",
    description:
      "Index a new GitHub repository in Code-Fundi, or update an existing one. " +
      "After indexing, the repository's files will be searchable via code-fundi-search.",
    parameters: z.object({
      url: z.string().describe("Git clone URL (e.g. https://github.com/owner/repo)"),
      branch: z.string().optional().describe("Branch to index (default: main/master)"),
      update: z.boolean().optional().describe("If true, re-index an already indexed repo"),
    }),
    annotations: { title: "Index Repository", readOnlyHint: false, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.indexRepo(args);
        if (res.data?.repo) {
          return formatIndexResult(res.data.repo, res.message);
        }
        return res.message || "Repository indexing initiated.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-repo-status",
    description: "Check the indexing status of a repository by its clone URL.",
    parameters: z.object({
      url: z.string().describe("Git clone URL to check status for"),
    }),
    annotations: { title: "Repository Status", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getRepoStatus(args.url);
        return res.data ? formatRepoStatus(res.data) : "No status data available.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-repo-readme",
    description:
      "Get the parsed README documentation for a repository. " +
      "Provide either a repository UUID or a clone URL. " +
      "Deprecated in favor of code-fundi-repo-blueprint, which returns the same README plus dependency and convention intelligence.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
    }),
    annotations: { title: "Repository README", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getRepoReadme(args.repo_key);
        return res.data ? formatReadme(res.data) : "No README found.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-list-public-repos",
    description:
      "Browse the global catalog of indexed public repositories (across all Code-Fundi users). " +
      "Supports pagination, an `updated_since` cursor, and optional embedding of each repo's largest files. " +
      "This endpoint does not require an API key.",
    parameters: z.object({
      limit: z.number().int().min(1).max(500).optional().describe("Max results per page (default 100)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
      since: z.string().optional().describe("Return repos updated strictly after this ISO 8601 timestamp"),
      file_count: z.number().int().min(0).max(50).optional().describe("When > 0, embed this many largest files per repo (default 0)"),
      internal_secret: z.string().optional().describe("Internal sitemap secret for unlimited server-side enumeration (optional)"),
    }),
    annotations: { title: "List Public Repositories", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const { internal_secret, ...opts } = args;
        const res = await client.listPublicRepos({ ...opts, internalSecret: internal_secret });
        return formatPublicRepoList(res.data || [], res.pagination);
      } catch (err) { return formatError(err); }
    },
  });
}
