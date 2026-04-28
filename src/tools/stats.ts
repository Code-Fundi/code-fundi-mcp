/**
 * Code-Fundi MCP — Statistics Tools
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatUsageStats, formatActivityStats, formatLanguageStats, formatError } from "../formatters.js";

export function registerStatsTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-usage-stats",
    description: "Get query-type usage statistics for a given date range. Shows breakdown by query type with counts, credit costs, and average durations.",
    parameters: z.object({
      range: z.enum(["1d", "7d", "30d", "60d", "90d", "365d"]).optional().describe("Time range (default: 7d)"),
    }),
    annotations: { title: "Usage Statistics", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getUsageStats(args.range as any);
        if (res.data) return formatUsageStats(res.data.usage_by_type, res.data.total_queries);
        return "No usage data available.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-activity-stats",
    description: "Get daily activity statistics for a given date range. Shows queries per day with credit costs.",
    parameters: z.object({
      range: z.enum(["1d", "7d", "30d", "60d", "90d", "365d"]).optional().describe("Time range (default: 7d)"),
    }),
    annotations: { title: "Activity Statistics", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getActivityStats(args.range as any);
        if (res.data) return formatActivityStats(res.data.activity_by_day, res.data.total_queries, res.data.active_days);
        return "No activity data available.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-language-stats",
    description: "Get programming language usage statistics across all indexed repositories.",
    parameters: z.object({}),
    annotations: { title: "Language Statistics", readOnlyHint: true },
    execute: async () => {
      try {
        const client = getClient();
        const res = await client.getLanguageStats();
        if (res.data) return formatLanguageStats(res.data.languages, res.data.total_queries);
        return "No language data available.";
      } catch (err) { return formatError(err); }
    },
  });
}
