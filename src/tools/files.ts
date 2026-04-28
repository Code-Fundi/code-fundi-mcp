/**
 * Code-Fundi MCP — File Tools
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatFileList, formatFileDocumentation, formatError } from "../formatters.js";

export function registerFileTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-list-files",
    description:
      "List files in an indexed Code-Fundi repository. " +
      "Supports search by file name/path and pagination. " +
      "Use the returned file IDs with code-fundi-file-docs to get documentation.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
      search: z.string().optional().describe("Case-insensitive substring filter on file name/path"),
      limit: z.number().min(1).max(100).optional().describe("Max results per page"),
      offset: z.number().min(0).optional().describe("Pagination offset"),
      order_by: z.string().optional().describe("Sort field (default: file_path)"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    }),
    annotations: { title: "List Files", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const { repo_key, ...opts } = args;
        const res = await client.listFiles(repo_key, opts);
        return formatFileList(res.data || [], res.pagination);
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-file-docs",
    description:
      "Get AI-generated documentation for a specific file in an indexed repository. " +
      "Returns detailed documentation including summaries, functions, dependencies, and code analysis.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
      file_id: z.string().describe("File UUID (from code-fundi-list-files results)"),
      fields: z.enum(["basic", "summary", "full"]).optional().describe("Documentation detail level (default: full)"),
    }),
    annotations: { title: "File Documentation", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getFileDocumentation(args.repo_key, args.file_id, args.fields);
        return res.data ? formatFileDocumentation(res.data) : "No documentation available.";
      } catch (err) { return formatError(err); }
    },
  });
}
