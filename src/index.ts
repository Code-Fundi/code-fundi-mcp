#!/usr/bin/env node

/**
 * Code-Fundi MCP Server
 *
 * A production-grade MCP server that wraps the Code-Fundi API,
 * enabling any MCP-compatible AI assistant to search, research,
 * index, and manage code repositories.
 *
 * Built with FastMCP (TypeScript) + Zod schema validation.
 */

import { FastMCP } from "fastmcp";

import { registerSearchTools } from "./tools/search.js";
import { registerRepoTools } from "./tools/repos.js";
import { registerRepoIntelTools } from "./tools/intel.js";
import { registerFileTools } from "./tools/files.js";
import { registerHistoryTools } from "./tools/history.js";
import { registerStatsTools } from "./tools/stats.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerChatTools } from "./tools/chat.js";

const server = new FastMCP({
  name: "Code-Fundi",
  version: "0.1.0",
});

// Register all tool groups
registerSearchTools(server);
registerRepoTools(server);
registerRepoIntelTools(server);
registerFileTools(server);
registerHistoryTools(server);
registerStatsTools(server);
registerAuthTools(server);
registerChatTools(server);

// Start with stdio transport (default for IDE integrations)
server.start({
  transportType: "stdio",
});
