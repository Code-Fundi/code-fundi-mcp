/**
 * Code-Fundi MCP — Chat & Models
 *
 * Includes:
 * - v2 chat (primary): `POST /v2/chat` with JSON/NDJSON/text normalization + v1 fallback
 * - v1 Fundi chat (legacy): `POST /v1/fundi/chat`
 * - model catalog: `GET /v1/fundi/models`
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { CODEFUNDI_DEFAULT_CHAT_MODEL_ID, getClient } from "../client.js";
import { formatModels, formatError, formatV2ChatResult } from "../formatters.js";

export function registerChatTools(server: FastMCP): void {
  const contextSchema = z.object({
    role: z.enum(["user", "assistant", "system"]).optional(),
    content: z.string().optional(),
  }).passthrough();

  server.addTool({
    name: "code-fundi-chat-v2",
    description:
      "Send a chat message via Code-Fundi v2 chat endpoint (POST /v2/chat). " +
      "Supports repo-aware context (`repo_ids` / `repo_urls`) and conversation continuation. " +
      "Automatically falls back to v1 chat when v2 chat is not available in a deployment.",
    parameters: z.object({
      prompt: z.string().describe("User message"),
      model: z.string().optional().describe(
        `Model ID (default: ${CODEFUNDI_DEFAULT_CHAT_MODEL_ID})`,
      ),
      conversation_id: z.string().optional().describe("Conversation/thread ID to continue an existing chat"),
      repo_ids: z.array(z.string()).optional().describe("Repository source UUIDs for context scoping"),
      repo_urls: z.array(z.string()).optional().describe("Repository clone URLs for context scoping"),
      context: z.array(contextSchema).optional().describe("Optional prior conversation messages"),
      stream: z.boolean().optional().describe("Hint for server-side streaming behavior"),
      fallback_to_v1: z.boolean().optional().describe("Fallback to v1 chat on v2 not-supported errors (default: true)"),
      extra: z.record(z.unknown()).optional().describe("Additional deployment-specific request keys merged into the v2 payload"),
    }),
    annotations: { title: "Code-Fundi Chat v2", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.chatV2({
          prompt: args.prompt,
          model: args.model,
          conversation_id: args.conversation_id,
          repo_ids: args.repo_ids,
          repo_urls: args.repo_urls,
          context: args.context,
          stream: args.stream,
          extra: args.extra,
        }, {
          fallbackToV1: args.fallback_to_v1,
        });
        return formatV2ChatResult(res);
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-chat",
    description:
      "Send a message to legacy Fundi chat (POST /v1/fundi/chat). " +
      "Supports threading, optional code context, indexed repository knowledge (`knowledge_id`), embeddings memory, and voice mode. " +
      "Responses are streamed by the API and returned as plain text (or JSON when the server uses JSON mode).",
    parameters: z.object({
      prompt: z.string().describe("User message (sent to the API as `question`)"),
      model: z.string().optional().describe("AI model ID to use"),
      conversation: z.string().optional().describe("Conversation ID for threading (continues a previous conversation)"),
      code_block: z.string().optional().describe("Optional code snippet combined with the question for code-aware answers"),
      knowledge_id: z.array(z.string()).optional().describe(
        "Repository / data-source UUIDs to pull indexed knowledge context into the chat (API field `knowledge`)",
      ),
      embed: z.boolean().optional().describe("Enable conversation memory via embeddings (default false)"),
      voice: z.boolean().optional().describe("Request voice/audio path on the server (default false)"),
      context: z.array(contextSchema).optional().describe("Previous conversation messages for context"),
    }),
    annotations: { title: "Code-Fundi Chat (Legacy v1)", readOnlyHint: true, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.chat({
          prompt: args.prompt,
          model: args.model,
          conversation: args.conversation,
          context: args.context,
          code_block: args.code_block,
          knowledge_id: args.knowledge_id,
          embed: args.embed,
          voice: args.voice,
        });
        const parts: string[] = [];
        if (res.response) parts.push(res.response);
        else parts.push("_No response generated._");
        if (res.model) parts.push(`\n_Model: ${res.model}_`);
        if (res.usage) {
          const tokens = [
            res.usage.prompt_tokens && `prompt: ${res.usage.prompt_tokens}`,
            res.usage.completion_tokens && `completion: ${res.usage.completion_tokens}`,
          ].filter(Boolean).join(", ");
          if (tokens) parts.push(`_Tokens: ${tokens}_`);
        }
        return parts.join("\n");
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-list-models",
    description: "List all available AI models on Code-Fundi with their providers and required tier.",
    parameters: z.object({}),
    annotations: { title: "List AI Models", readOnlyHint: true },
    execute: async () => {
      try {
        const client = getClient();
        const res = await client.getModels();
        return formatModels(res.models || []);
      } catch (err) { return formatError(err); }
    },
  });
}
