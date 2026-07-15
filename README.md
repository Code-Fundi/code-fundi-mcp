<p align="center">
 <h2 align="center"><b>Code Fundi</b></h2>
 <p align="center">The Codebase Context Layer for Agents, Teams and Applications.</p>
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

A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Code-Fundi](https://api.codefundi.app) API. Enables any MCP-compatible AI assistant — Claude, Cursor, Windsurf, VS Code Copilot, and more — to search, research, index, and scan code repositories through natural language.

Built with [FastMCP](https://github.com/punkpeye/fastmcp) (TypeScript) and [Zod](https://zod.dev) for schema validation.

## Features

- 🔍 **Semantic & grep code search** across indexed repositories
- 🧠 **AI-powered research** — search + AI analysis in a single call
- 📦 **Repository management** — index, status, README, listing, public catalog
- 🛰️ **Repository intelligence** — scope (dependencies/functions/variables), cross-repo dependency map, blueprint, blast radius, code review, and test-gap analysis
- 📄 **File documentation** — AI-generated docs for any indexed file
- 📊 **Usage statistics** — query usage, activity, language breakdowns
- 🔐 **Agent-driven authentication** — sign up/sign in via OTP without pre-configured keys
- 💬 **AI chat & model insight** — direct conversation with Code-Fundi AI, model catalog, and per-tier limits

## Quick Start

### Install from npm (recommended)

Install the package (includes a pre-built `dist/`). The `code-fundi-mcp` binary is on your `PATH` when installed globally, or available via `npx` without cloning the repo:

```bash
npm install -g code-fundi-mcp
```

Or add it to a project:

```bash
npm install code-fundi-mcp
```

### Install from source (this repository)

```bash
git clone https://github.com/Code-Fundi/code-fundi-mcp.git
cd code-fundi-mcp
npm install
npm run build
```

### Configure

Set your API key as an environment variable:

```bash
export CODEFUNDI_API_KEY=your_api_key_here
```

Or skip this step — agents can authenticate dynamically using the `code-fundi-auth-*` tools.

### Use with Claude Desktop

After a global install (`npm i -g code-fundi-mcp`), point MCP at the published binary — **no path to `dist/index.js` required**:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "code-fundi-mcp",
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
      "args": ["-y", "code-fundi-mcp"],
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Use with Cursor

Same pattern as Claude — `command` + optional `args` only; no manual path to the repo:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "npx",
      "args": ["-y", "code-fundi-mcp"],
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

## Tools Reference (30 tools)

Covers the Code-Fundi **V2** API: search (including search-with-chat / research), repositories (list, index, status, readme, public catalog), repository intelligence (scope, map, blueprint, radius, review, test-gaps), files, history, statistics, API keys, authentication, plus **Fundi chat** (`POST /v1/fundi/chat`) and the V2 model catalog / limits (`GET /v2/models`, `GET /v2/models/limits`).

### Search

| Tool | Description |
|------|-------------|
| `code-fundi-search` | Semantic/grep search across repositories with filters |
| `code-fundi-research` | Search + AI-synthesized analysis of matching code |

### Repositories

| Tool | Description |
|------|-------------|
| `code-fundi-list-repos` | List indexed repositories with pagination |
| `code-fundi-index-repo` | Index a new GitHub repository |
| `code-fundi-repo-status` | Check repository indexing status |
| `code-fundi-repo-readme` | Get repository README documentation (deprecated — prefer blueprint) |
| `code-fundi-list-public-repos` | Browse the global catalog of indexed public repositories (no key needed) |

### Repository Intelligence

| Tool | Description |
|------|-------------|
| `code-fundi-repo-scope` | Aggregated dependencies, functions, and variables (with drill-down and cross-repo comparison) |
| `code-fundi-repo-map` | Cross-repository dependency map |
| `code-fundi-repo-blueprint` | README + dependency/convention overview (successor to repo-readme) |
| `code-fundi-repo-radius` | Blast radius / file impact analysis (PRO+) |
| `code-fundi-repo-review` | Per-file code review signals: verdict, risk, complexity, coverage, debt (PRO+) |
| `code-fundi-repo-test-gaps` | Test coverage gap analysis with suggested test cases (PRO+) |

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

The server supports two authentication modes:

### Pre-configured API Key (Recommended)

Set `CODEFUNDI_API_KEY` in your MCP config environment. All tools work immediately.

### Agent-Driven Auth (Dynamic)

When no API key is set, agents can self-authenticate:

1. Call `code-fundi-auth-authenticate` with email and `auth_mode: "otp"`
2. User receives an OTP code via email
3. Call `code-fundi-auth-verify` with the 6-digit code
4. API key is automatically configured — all tools now work

This enables fully autonomous agent setup without manual configuration.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CODEFUNDI_API_KEY` | No* | — | API key for authentication |
| `CODEFUNDI_BASE_URL` | No | `https://api.codefundi.app` | API base URL override |

\* Required unless using agent-driven auth tools.

## License

MIT
