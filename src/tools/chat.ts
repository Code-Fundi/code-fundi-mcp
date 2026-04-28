/**
 * Code-Fundi MCP — Chat & Models Tools (V1, no V2 equivalent)
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatModels, formatError } from "../formatters.js";

export function registerChatTools(server: FastMCP): void {
  server.addTool({
    name: "code-fundi-chat",
    description:
      "Send a chat message to the Code-Fundi AI. " +
      "Supports conversation threading and optional context from previous messages.",
    parameters: z.object({
      prompt: z.string().describe("The message to send to the AI"),
      model: z.string().optional().describe("AI model ID to use"),
      conversation: z.string().optional().describe("Conversation ID for threading (continues a previous conversation)"),
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
