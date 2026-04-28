/**
 * Code-Fundi MCP — History Tools
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatHistoryList, formatHistoryDetail, formatConversation, formatError } from "../formatters.js";

export function registerHistoryTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-list-history",
    description:
      "List your Code-Fundi query history with optional filters for date range, category, endpoint, and repository.",
    parameters: z.object({
      limit: z.number().min(1).max(100).optional().describe("Max results per page"),
      offset: z.number().min(0).optional().describe("Pagination offset"),
      from: z.string().optional().describe("Start date (ISO 8601)"),
      to: z.string().optional().describe("End date (ISO 8601)"),
      endpoint: z.string().optional().describe("Exact endpoint match (e.g. 'v2.search')"),
      query_type: z.string().optional().describe("Exact query_type match (e.g. 'search:semantic')"),
      query_type_prefix: z.string().optional().describe("Prefix match on query_type (e.g. 'search:')"),
      repo_id: z.string().optional().describe("Filter by repository UUID"),
      conversation_id: z.string().optional().describe("Filter by conversation thread"),
      categories: z.array(z.enum(["chat", "search", "research", "files", "index", "repos", "history", "stats", "keys", "models", "other"])).optional().describe("Filter by categories"),
    }),
    annotations: { title: "List History", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.listHistory(args);
        return formatHistoryList(res.data || [], res.pagination);
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-history-item",
    description: "Get the full details of a single history entry by its ID, including the complete response and knowledge sources.",
    parameters: z.object({
      history_id: z.string().describe("History entry UUID"),
    }),
    annotations: { title: "History Item Detail", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getHistoryItem(args.history_id);
        return res.data ? formatHistoryDetail(res.data) : "History item not found.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-conversation",
    description: "Get all messages in a conversation thread by its conversation ID.",
    parameters: z.object({
      conversation_id: z.string().describe("Conversation thread UUID"),
    }),
    annotations: { title: "Conversation Thread", readOnlyHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.getConversation(args.conversation_id);
        if (res.data) {
          return formatConversation(res.data.conversation_id, res.data.messages, res.data.message_count);
        }
        return "Conversation not found.";
      } catch (err) { return formatError(err); }
    },
  });
}
