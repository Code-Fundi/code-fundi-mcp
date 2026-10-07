#!/usr/bin/env node

/**
 * Code-Fundi MCP Server
 *
 * A production-grade MCP server that wraps the Code-Fundi API,
 * enabling any MCP-compatible AI assistant to search, research,
 * index, and manage code repositories.
 *
 * Built with FastMCP (TypeScript) + Zod schema validation.
 *
 * Transports:
 * - stdio (default) — local Cursor / Claude Desktop via npx
 * - httpStream — CODEFUNDI_MCP_TRANSPORT=httpStream (remote OAuth / API key)
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
import {
  authenticateHttpRequest,
  isHttpStreamTransport,
  type McpSessionAuth,
} from "./sessionClient.js";

const issuer = (
  process.env.FUNDI_AI_PUBLIC_URL ||
  process.env.CODEFUNDI_BASE_URL ||
  "https://api.codefundi.app"
).replace(/\/+$/, "");

const httpMode = isHttpStreamTransport();

const server = new FastMCP<McpSessionAuth>({
  name: "Code-Fundi",
  version: "0.1.0",
  ...(httpMode
    ? {
        authenticate: async (request: Parameters<typeof authenticateHttpRequest>[0]) =>
          authenticateHttpRequest(request),
        oauth: {
          enabled: true,
          authorizationServer: {
            issuer,
            authorizationEndpoint: `${issuer}/oauth/authorize`,
            tokenEndpoint: `${issuer}/oauth/token`,
            registrationEndpoint: `${issuer}/oauth/register`,
            codeChallengeMethodsSupported: ["S256"],
            grantTypesSupported: ["authorization_code", "refresh_token"],
            responseTypesSupported: ["code"],
            tokenEndpointAuthMethodsSupported: [
              "none",
              "client_secret_post",
              "client_secret_basic",
            ],
          },
          protectedResource: {
            resource: `${issuer}/mcp`,
            authorizationServers: [issuer],
            scopesSupported: ["mcp"],
            bearerMethodsSupported: ["header"],
          },
        },
      }
    : {}),
});

registerSearchTools(server);
registerRepoTools(server);
registerRepoIntelTools(server);
registerFileTools(server);
registerHistoryTools(server);
registerStatsTools(server);
registerAuthTools(server);
registerChatTools(server);

async function main(): Promise<void> {
  if (httpMode) {
    const port = Number(process.env.PORT || process.env.CODEFUNDI_MCP_PORT || 8080);
    await server.start({
      transportType: "httpStream",
      httpStream: {
        port,
        endpoint: "/mcp",
      },
    });
    return;
  }

  await server.start({
    transportType: "stdio",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
