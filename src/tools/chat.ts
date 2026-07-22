/**
 * Code-Fundi MCP — Chat & Models
 *
 * Chat uses `POST /v1/fundi/chat` (OpenAPI "AI Chat"). The production API streams HTML;
 * the client collects the full body into a single string for MCP tools.
 * The model catalog uses `GET /v2/models` and per-tier limits use `GET /v2/models/limits`.
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatModels, formatModelLimits, formatError } from "../formatters.js";

export function registerChatTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-chat",
    description:
      "Send a message to Code-Fundi AI (Fundi chat: POST /v1/fundi/chat). " +
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
      context: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]).optional(),
        content: z.string().optional(),
      })).optional().describe("Previous conversation messages for context"),
    }),
    annotations: { title: "Code-Fundi Chat", readOnlyHint: true, openWorldHint: true },
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
    description:
      "List the curated Code-Fundi chat model catalog (GET /v2/models) with providers, required tier, and context length.",
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

  server.addTool({
    name: "code-fundi-model-limits",
    description:
      "Get the AI model limits and tier configuration for your account (GET /v2/models/limits): " +
      "subscription tokens, the active model's context/knowledge limits, and account limits such as " +
      "max repositories, files per repo, history retention, and organization access.",
    parameters: z.object({}),
    annotations: { title: "Model Limits", readOnlyHint: true },
    execute: async () => {
      try {
        const client = getClient();
        const res = await client.getModelLimits();
        return res.data ? formatModelLimits(res.data) : "No model limit data available.";
      } catch (err) { return formatError(err); }
    },
  });
}
