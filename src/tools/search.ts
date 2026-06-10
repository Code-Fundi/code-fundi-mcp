/**
 * Code-Fundi MCP — Search Tools
 *
 * code-fundi-search: semantic/grep search across repositories
 * code-fundi-research: search + AI chat (NDJSON streaming, collected)
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatSearchResults, formatResearchResult, formatError } from "../formatters.js";

export function registerSearchTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-search",
    description:
      "Search across indexed Code-Fundi repositories using semantic search, grep over docs, or grep over code. " +
      "Returns matching files with similarity scores, paths, and optional documentation. " +
      "Use scan_mode to choose between semantic (vector), grep_docs (substring on documentation), or grep_code (substring on source code).",
    parameters: z.object({
      query: z.string().describe("The search query string"),
      scope: z.enum(["all", "repos", "files", "code", "functions"]).optional().describe("Search scope (default: all)"),
      scan_mode: z.enum(["semantic", "grep_docs", "grep_code"]).optional().describe("Search mode (default: semantic)"),
      repo_ids: z.array(z.string()).optional().describe("Filter by repository UUIDs"),
      repo_urls: z.array(z.string()).optional().describe("Filter by repository clone URLs"),
      fields: z.string().optional().describe(
        "Documentation field preset or custom field path list (basic|summary|full|raw or comma-separated paths).",
      ),
      similarity_threshold: z.number().min(0).max(1).optional().describe("Minimum similarity score (0-1)"),
      file_types: z.array(z.string()).optional().describe("Filter by file extensions (e.g. ['.ts', '.py'])"),
      file_paths: z.array(z.string()).optional().describe("Filter by file path patterns"),
      dependencies: z.array(z.string()).optional().describe("Filter by declared dependencies in code summaries"),
      function_names: z.array(z.string()).optional().describe("Filter by function names in code summaries"),
      has_functions: z.boolean().optional().describe("Only return files that define functions"),
      min_lines: z.number().int().min(0).optional().describe("Minimum file line count"),
      max_lines: z.number().int().min(0).optional().describe("Maximum file line count"),
      visibility: z.enum(["private", "public", "all"]).optional().describe("Repository visibility filter"),
    }),
    annotations: { title: "Code-Fundi Search", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const response = await client.search({
          query: args.query,
          scope: args.scope,
          scan_mode: args.scan_mode,
          repo_ids: args.repo_ids,
          repo_urls: args.repo_urls,
          fields: args.fields,
          similarity_threshold: args.similarity_threshold,
          filters: {
            file_types: args.file_types,
            file_paths: args.file_paths,
            dependencies: args.dependencies,
            function_names: args.function_names,
            has_functions: args.has_functions,
            min_lines: args.min_lines,
            max_lines: args.max_lines,
            visibility: args.visibility,
          },
        });
        return formatSearchResults(response.data || [], response.meta, response.total);
      } catch (err) {
        return formatError(err);
      }
    },
  });

  server.addTool({
    name: "code-fundi-research",
    description:
      "Search Code-Fundi repositories AND get an AI-synthesized analysis of the results. " +
      "This performs a search, then streams an AI response that analyzes the matching code files. " +
      "Use this when you need both code context and an intelligent summary/explanation.",
    parameters: z.object({
      query: z.string().describe("The research query"),
      scope: z.enum(["all", "repos", "files", "code", "functions"]).optional().describe("Search scope"),
      scan_mode: z.enum(["semantic", "grep_docs", "grep_code"]).optional().describe("Search mode"),
      model: z.string().optional().describe("AI model to use for analysis"),
      repo_ids: z.array(z.string()).optional().describe("Filter by repository UUIDs"),
      repo_urls: z.array(z.string()).optional().describe("Filter by repository clone URLs"),
      fields: z.string().optional().describe(
        "Documentation field preset or custom field path list (basic|summary|full|raw or comma-separated paths).",
      ),
      dependencies: z.array(z.string()).optional().describe("Filter by dependencies in code summaries"),
      function_names: z.array(z.string()).optional().describe("Filter by function names"),
      has_functions: z.boolean().optional().describe("Only files with functions"),
      min_lines: z.number().int().min(0).optional(),
      max_lines: z.number().int().min(0).optional(),
      file_types: z.array(z.string()).optional(),
      file_paths: z.array(z.string()).optional(),
      visibility: z.enum(["private", "public", "all"]).optional(),
      similarity_threshold: z.number().min(0).max(1).optional(),
    }),
    annotations: { title: "Code-Fundi Research", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const result = await client.searchWithChat({
          query: args.query,
          scope: args.scope,
          scan_mode: args.scan_mode,
          model: args.model,
          repo_ids: args.repo_ids,
          repo_urls: args.repo_urls,
          fields: args.fields,
          similarity_threshold: args.similarity_threshold,
          filters: {
            file_types: args.file_types,
            file_paths: args.file_paths,
            dependencies: args.dependencies,
            function_names: args.function_names,
            has_functions: args.has_functions,
            min_lines: args.min_lines,
            max_lines: args.max_lines,
            visibility: args.visibility,
          },
        });
        return formatResearchResult(result);
      } catch (err) {
        return formatError(err);
      }
    },
  });
}
