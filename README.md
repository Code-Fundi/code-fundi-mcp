<p align="center">
 <h2 align="center"><b>Code Fundi</b></h2>
 <p align="center">The Codebase Map for AI Agents, Teams and Applications.</p>
</p>
</p>
<p align="center">
 <img width="200px" src="https://github.com/Code-Fundi/.github/blob/main/media/logo-text(colour).png?raw=true" align="center" alt="Code Fundi" />
 </br>
</p>
</p>

<p align="center">
  <img src="https://img.shields.io/static/v1?label=Stage&message=Alpha&color=0071f3" />
  <a href="https://www.gnu.org/licenses/agpl-3.0">
    <img src="https://img.shields.io/static/v1?label=Licence&message=AGPL%20v3&color=000" />
  </a>
  <br />
  <a href="https://discord.gg/6RJTWCuWZj">
    <img src="https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white" />
  </a>
  <a href="https://twitter.com/code_fundi">
    <img src="https://img.shields.io/badge/Twitter-00acee?logo=twitter&logoColor=white" />
  </a>
  <a href="https://www.tiktok.com/@codefundi">
    <img src="https://img.shields.io/badge/TikTok-000000?logo=tiktok&logoColor=white" />
  </a>
<br />
</p>

# Code-Fundi MCP Server

A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Code-Fundi](https://api.codefundi.app) API: a codebase map and blast-radius engine for AI coding agents. Enables any MCP-compatible AI assistant (Claude, Claude Code, Cursor, Windsurf, VS Code Copilot, and more) to search, research, index, and scan code repositories through natural language, and see what a change breaks before it ships.

Built with [FastMCP](https://github.com/punkpeye/fastmcp) (TypeScript) and [Zod](https://zod.dev) for schema validation.

## Getting started for AI agents

If you are an AI agent (or configuring one) and **no `CODEFUNDI_API_KEY` is set**, you must self-authenticate before using search, repos, chat, or other authenticated tools. The auth tools (`code-fundi-auth-*`) work without a pre-existing key.

### Which path to use

| Situation | Action |
|-----------|--------|
| `CODEFUNDI_API_KEY` is set in MCP config | Use any tool immediately — the server sends it as `X-API-Key` on every request |
| No API key configured | Run the **OTP self-auth flow** below (recommended) or **password sign-in** |

### Zero-config MCP setup (no API key)

You can start the MCP server without `CODEFUNDI_API_KEY` and authenticate at runtime:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "npx",
      "args": ["-y", "@codefundi/code-fundi-mcp"]
    }
  }
}
```

### Self-authenticate with OTP (recommended)

Code-Fundi uses Supabase-backed auth (`POST /v2/auth/authenticate`, `/v2/auth/verify`, `/v2/auth/resend`). OTP emails contain a **6-digit code** — magic links are not supported on this path.

1. **Ask the human user for their email address.**
2. Call **`code-fundi-auth-authenticate`** with:
   - `auth_mode`: `"otp"`
   - `email`: the user's email
   - `should_create_user`: `true` for a **new** account, `false` for a **returning** user
3. Tell the user to check their inbox for a 6-digit code. The API may return `verification_required: true` and `api_key.key_state: "agent_pending"` until verification completes.
4. **Ask the user for the 6-digit OTP** (human-in-the-loop — you cannot guess or bypass this step).
5. Call **`code-fundi-auth-verify`** with the same `email` and the `token` (6 digits).
6. On success, the MCP server **automatically configures the API key in memory** for all subsequent tool calls in this session.

If the code expired or was not received, call **`code-fundi-auth-resend`** with the same `email`, then repeat step 5.

**Example dialogue:**

```
Agent: What email should I use to sign in to Code-Fundi?
User:  dev@example.com
Agent: [calls code-fundi-auth-authenticate] I've sent a 6-digit code to dev@example.com. Please paste it here.
User:  482913
Agent: [calls code-fundi-auth-verify] You're signed in. I can now search and index your repositories.
```

### Password sign-in (alternative)

For existing accounts with a password, call **`code-fundi-auth-authenticate`** with `auth_mode: "password"`, the user's `email`, `should_create_user: false`, and the `password` parameter. The MCP client sends the password only in the `X-CodeFundi-Auth-Password` header (never in the JSON body). Production requires HTTPS. Returning users may receive an active API key immediately without a separate verify step.

### After authentication

- The API key is held **in memory** for the lifetime of the MCP server process. It is **not** persisted across IDE or MCP restarts.
- Recommend the user add the key to their MCP config as `CODEFUNDI_API_KEY` so future sessions start authenticated.
- A FREE-tier account and API key are created automatically on first signup.

### Errors

| HTTP status | What to do |
|-------------|------------|
| **401** Unauthorized | No valid key — run the OTP flow above, or set `CODEFUNDI_API_KEY` |
| **429** Too many requests | Auth endpoints are rate-limited per IP; wait for `Retry-After` seconds, then retry |

## Features

Every tool below is backed by the same codebase map: structural dependencies, call graph, and blast radius, indexed once and queried in milliseconds.

- 🔍 **Semantic & grep code search** across your indexed codebase map
- 🧠 **AI-powered research**: search plus AI analysis in a single call
- 📦 **Repository management**: index, status, README, listing, public catalog
- 🛰️ **Repository intelligence**: cross-repo dependency map, blueprint, Blast-Radius Guard (impact analysis before you merge)
- 📄 **File documentation**: AI-generated docs for any indexed file
- 📊 **Usage statistics**: query usage, activity, language breakdowns
- 🔐 **Agent-driven authentication**: sign up/sign in via OTP without pre-configured keys
- 💬 **AI chat & model insight**: direct conversation with Code-Fundi AI, model catalog, and per-tier limits

## Quick Start

### Install from npm (recommended)

Install the package (includes a pre-built `dist/`). The `code-fundi-mcp` binary is on your `PATH` when installed globally, or available via `npx` without cloning the repo:

```bash
npm install -g @codefundi/code-fundi-mcp
```

Or add it to a project:

```bash
npm install @codefundi/code-fundi-mcp
```

### Install from source (this repository)

```bash
git clone https://github.com/Code-Fundi/code-fundi-mcp.git
cd code-fundi-mcp
npm install
npm run build
```

### Configure

**Option A — API key (fastest):** set your key as an environment variable:

```bash
export CODEFUNDI_API_KEY=your_api_key_here
```

**Option B — no API key:** skip the env var and let the agent self-authenticate at runtime. See [Getting started for AI agents](#getting-started-for-ai-agents).

Zero-config MCP example (no `env` block):

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "npx",
      "args": ["-y", "@codefundi/code-fundi-mcp"]
    }
  }
}
```

### Use with Claude Desktop

After a global install (`npm i -g @codefundi/code-fundi-mcp`), point MCP at the published binary (no path to `dist/index.js` required):

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "@codefundi/code-fundi-mcp",
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

If the binary is not on your `PATH`, use `npx` (downloads or uses the local package and runs the same entrypoint):

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "npx",
      "args": ["-y", "@codefundi/code-fundi-mcp"],
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Use with Cursor

Same pattern as Claude: `command` plus optional `args` only, no manual path to the repo:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "npx",
      "args": ["-y", "@codefundi/code-fundi-mcp"],
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

When developing **inside this repo**, you can run `npm run dev` or `npx tsx src/index.ts` without building first.

### Development Mode

```bash
npm run dev                          # Run with tsx (no build needed)
npx fastmcp inspect src/index.ts    # Open MCP Inspector UI
npx fastmcp dev src/index.ts        # Test with MCP CLI
```

## Tools Reference (27 tools)

Covers the Code-Fundi **V2** API for codebase mapping and blast-radius analysis: search (including search-with-chat / research), repositories (list, index, status, readme, public catalog), repository intelligence (map, blueprint, radius), files, history, statistics, API keys, authentication, plus **Fundi chat** (`POST /v1/fundi/chat`) and the V2 model catalog / limits (`GET /v2/models`, `GET /v2/models/limits`).

### Search

| Tool | Description |
|------|-------------|
| `code-fundi-search` | Semantic and grep search across your indexed codebase map, with filters |
| `code-fundi-research` | Search plus AI-synthesized analysis of matching code |

### Repositories

| Tool | Description |
|------|-------------|
| `code-fundi-list-repos` | List indexed repositories with pagination |
| `code-fundi-index-repo` | Index a new GitHub repository into your codebase map |
| `code-fundi-repo-status` | Check repository indexing status |
| `code-fundi-repo-readme` | Get repository README documentation (deprecated, prefer blueprint) |
| `code-fundi-list-public-repos` | Browse the global catalog of indexed public repositories (no key needed) |

### Repository Intelligence

| Tool | Description |
|------|-------------|
| `code-fundi-repo-map` | Cross-repository dependency map: how services and packages actually connect |
| `code-fundi-repo-blueprint` | README plus dependency and convention overview (successor to repo-readme) |
| `code-fundi-repo-radius` | Blast-Radius Guard: every file and function that breaks before you merge (PRO+) |

### Files

| Tool | Description |
|------|-------------|
| `code-fundi-list-files` | List files in a repository |
| `code-fundi-file-docs` | Get AI-generated file documentation |

### History

| Tool | Description |
|------|-------------|
| `code-fundi-list-history` | List query history with filters |
| `code-fundi-history-item` | Get full details of a history entry |
| `code-fundi-conversation` | Get conversation thread messages |

### Statistics

| Tool | Description |
|------|-------------|
| `code-fundi-usage-stats` | Query-type usage breakdown |
| `code-fundi-activity-stats` | Daily activity statistics |
| `code-fundi-language-stats` | Programming language usage |

### Authentication

| Tool | Description |
|------|-------------|
| `code-fundi-auth-authenticate` | Start OTP/password auth flow (no key needed) |
| `code-fundi-auth-verify` | Verify OTP code and obtain API key |
| `code-fundi-auth-resend` | Resend OTP verification email |
| `code-fundi-list-api-keys` | List API keys (masked) |
| `code-fundi-regenerate-api-key` | Regenerate API key |
| `code-fundi-disable-api-key` | Disable an API key by ID (`DELETE /v2/keys/{key_id}`) |

### Chat & Models

| Tool | Description |
|------|-------------|
| `code-fundi-chat` | Fundi AI chat (`POST /v1/fundi/chat`; streamed responses are collected to text) |
| `code-fundi-list-models` | List the curated chat model catalog (`GET /v2/models`) |
| `code-fundi-model-limits` | Get AI model limits and tier configuration (`GET /v2/models/limits`) |

## Authentication

Two modes: **pre-configured API key** (`CODEFUNDI_API_KEY` in MCP config) or **agent-driven OTP/password auth** at runtime. Full step-by-step instructions, tool names, and error handling are in [Getting started for AI agents](#getting-started-for-ai-agents) at the top of this README.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CODEFUNDI_API_KEY` | No* | — | API key for authentication |
| `CODEFUNDI_BASE_URL` | No | `https://api.codefundi.app` | API base URL override |

\* Required unless using agent-driven auth tools.

## License

MIT