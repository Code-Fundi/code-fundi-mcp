/**
 * Per-session CodeFundi client for HTTP Stream transport.
 * Stdio continues to use the process-wide getClient() singleton.
 */

import { CodeFundiClient } from "./client.js";

export type McpSessionAuth = {
  apiKey: string;
  client: CodeFundiClient;
};

export function isHttpStreamTransport(): boolean {
  return String(process.env.CODEFUNDI_MCP_TRANSPORT || "").toLowerCase() === "httpstream";
}

/**
 * Resolve API key from request: X-API-Key or Bearer → POST /oauth/resolve.
 */
export async function authenticateHttpRequest(request: {
  headers?: Record<string, string | string[] | undefined>;
}): Promise<McpSessionAuth> {
  const headers = request.headers || {};
  const getHeader = (name: string): string | null => {
    const raw = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(raw)) return raw[0] || null;
    return raw ? String(raw) : null;
  };

  const apiKeyHeader = getHeader("x-api-key");
  const baseUrl = (process.env.CODEFUNDI_BASE_URL || process.env.FUNDI_AI_PUBLIC_URL || "https://api.codefundi.app").replace(
    /\/+$/,
    ""
  );

  if (apiKeyHeader) {
    return {
      apiKey: apiKeyHeader,
      client: new CodeFundiClient(baseUrl, apiKeyHeader),
    };
  }

  const authorization = getHeader("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) {
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized",
      headers: {
        "WWW-Authenticate": `Bearer realm="mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  const resource =
    process.env.OAUTH_RESOURCE_URL ||
    process.env.CODEFUNDI_MCP_RESOURCE ||
    `${baseUrl}/mcp`;

  const resolveRes = await fetch(`${baseUrl}/oauth/resolve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource }),
  });

  if (!resolveRes.ok) {
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized",
      headers: {
        "WWW-Authenticate": `Bearer realm="mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  const body = (await resolveRes.json()) as { api_key?: string };
  if (!body.api_key) {
    throw new Response(null, { status: 401, statusText: "Unauthorized" });
  }

  return {
    apiKey: body.api_key,
    client: new CodeFundiClient(baseUrl, body.api_key),
  };
}

/**
 * Prefer session-bound client on HTTP; never fall back to singleton under httpStream.
 */
export function clientFromSession(
  session: McpSessionAuth | undefined,
  getStdioClient: () => CodeFundiClient
): CodeFundiClient {
  if (isHttpStreamTransport()) {
    if (!session?.client) {
      throw new Error(
        "HTTP Stream transport requires a per-session CodeFundiClient from authenticate(); getClient() singleton is forbidden"
      );
    }
    return session.client;
  }
  if (session?.client) {
    return session.client;
  }
  return getStdioClient();
}

/**
 * Extract CodeFundiClient from FastMCP tool context.session (typed loosely by FastMCP).
 */
export function clientFromToolSession(session: unknown): CodeFundiClient | undefined {
  if (
    session &&
    typeof session === "object" &&
    "client" in session &&
    (session as McpSessionAuth).client instanceof CodeFundiClient
  ) {
    return (session as McpSessionAuth).client;
  }
  return undefined;
}
