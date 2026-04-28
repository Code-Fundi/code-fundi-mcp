# Code-Fundi MCP Server

A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Code-Fundi](https://api.codefundi.app) API. Enables any MCP-compatible AI assistant — Claude, Cursor, Windsurf, VS Code Copilot, and more — to search, research, index, and manage code repositories through natural language.

Built with [FastMCP](https://github.com/punkpeye/fastmcp) (TypeScript) and [Zod](https://zod.dev) for schema validation.

## Features

- 🔍 **Semantic & grep code search** across indexed repositories
- 🧠 **AI-powered research** — search + AI analysis in a single call
- 📦 **Repository management** — index, status, README, listing
- 📄 **File documentation** — AI-generated docs for any indexed file
- 📊 **Usage statistics** — query usage, activity, language breakdowns
- 🔐 **Agent-driven authentication** — sign up/sign in via OTP without pre-configured keys
- 💬 **AI chat** — direct conversation with Code-Fundi AI

## Quick Start

### 1. Install

```bash
npm install
npm run build
```

### 2. Configure

Set your API key as an environment variable:

```bash
export CODEFUNDI_API_KEY=your_api_key_here
```

Or skip this step — agents can authenticate dynamically using the `code-fundi-auth-*` tools.

### 3. Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "node",
      "args": ["path/to/code-fundi-mcp/dist/index.js"],
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 4. Use with Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "code-fundi": {
      "command": "node",
      "args": ["path/to/code-fundi-mcp/dist/index.js"],
      "env": {
        "CODEFUNDI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Development Mode

```bash
npm run dev                          # Run with tsx (no build needed)
npx fastmcp inspect src/index.ts    # Open MCP Inspector UI
npx fastmcp dev src/index.ts        # Test with MCP CLI
```

## Tools Reference (21 tools)

### Search

| Tool | Description |
|------|-------------|
| `code-fundi-search` | Semantic/grep search across repositories with filters |
| `code-fundi-research` | Search + AI-synthesized analysis of matching code |

### Repositories

| Tool | Description |
|------|-------------|
| `code-fundi-list-repos` | List indexed repositories with pagination |
| `code-fundi-index-repo` | Index a new GitHub/GitLab repository |
| `code-fundi-repo-status` | Check repository indexing status |
| `code-fundi-repo-readme` | Get repository README documentation |

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

### Chat & Models

| Tool | Description |
|------|-------------|
| `code-fundi-chat` | Chat with Code-Fundi AI |
| `code-fundi-list-models` | List available AI models |

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
