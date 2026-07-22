/**
 * Code-Fundi MCP — Repository Intelligence Tools
 *
 * V2 repository intelligence: dependency map, blueprint, blast radius.
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import {
  formatRepoMap, formatRepoBlueprint,
  formatRepoRadius, formatError,
} from "../formatters.js";

export function registerRepoIntelTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-repo-map",
    description:
      "Build a cross-repository dependency map showing where a dependency appears across the source repo, " +
      "optional compared repos, and (optionally) the public index. Returns structured JSON. Consumes credits.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
      dependency: z.string().optional().describe("Dependency name to map"),
      type: z.enum(["package", "import", "export", "env"]).optional().describe("Dependency type filter"),
      compare_repos: z.array(z.string()).optional().describe("Repository UUIDs to compare against (max 10)"),
      include_public_index: z.boolean().optional().describe("Include matches from the public index (default false)"),
      limit: z.number().int().min(1).max(50).optional().describe("Max dependencies (default 25)"),
      files_per_repo: z.number().int().min(1).max(100).optional().describe("Max files per repo (default 25)"),
      demo: z.boolean().optional().describe("Run in demo mode (pre-signup, public data, IP-based credits)"),
    }),
    annotations: { title: "Repository Dependency Map", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const { repo_key, compare_repos, ...rest } = args;
        const res = await client.getRepoMap(repo_key, {
          ...rest,
          compare_repos: compare_repos?.length ? compare_repos.join(",") : undefined,
        });
        return res.data ? formatRepoMap(res.data) : "No dependency map available.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-repo-blueprint",
    description:
      "Get the canonical repository intelligence overview: README documentation, top dependencies, " +
      "top functions/variables, and aggregated coding conventions (PRO+ only). " +
      "This is the successor to `code-fundi-repo-readme`. Consumes credits.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
      conventions_path_prefix: z.string().optional().describe("Optional path prefix filter for conventions aggregation (PRO+)"),
      demo: z.boolean().optional().describe("Run in demo mode (pre-signup, public data, IP-based credits)"),
    }),
    annotations: { title: "Repository Blueprint", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const { repo_key, ...opts } = args;
        const res = await client.getRepoBlueprint(repo_key, opts);
        return res.data ? formatRepoBlueprint(res.data, res.meta) : "No blueprint available.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-repo-radius",
    description:
      "Run blast-radius / file impact analysis for one or more files or dependencies. " +
      "Returns projected data flows, entry points, and call edges. Requires PRO, ENTERPRISE, or ADMIN tier " +
      "(STARTUP is not eligible) and consumes credits.",
    parameters: z.object({
      repo_key: z.string().describe("Repository UUID or clone URL"),
      file: z.string().optional().describe("Single file path to analyze"),
      files: z.array(z.string()).optional().describe("Multiple file paths to analyze"),
      dependency: z.string().optional().describe("Single dependency name to analyze"),
      dependencies: z.array(z.string()).optional().describe("Multiple dependency names to analyze"),
      include: z.array(z.string()).optional().describe("Projection kinds to include (e.g. data_flows, entry_points, call_edges)"),
      limit: z.number().int().min(1).optional().describe("Max targets to return"),
      demo: z.boolean().optional().describe("Run in demo mode (pre-signup, public data, IP-based credits)"),
    }),
    annotations: { title: "Repository Blast Radius", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const { repo_key, demo, ...body } = args;
        const res = await client.getRepoRadius(repo_key, body, demo);
        return res.data ? formatRepoRadius(res.data) : "No blast radius data available.";
      } catch (err) { return formatError(err); }
    },
  });
}
