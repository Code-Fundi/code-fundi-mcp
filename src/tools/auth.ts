/**
 * Code-Fundi MCP — Auth & API Key Tools
 *
 * Auth tools do NOT require an existing API key — they allow agents to
 * sign up / sign in and dynamically configure the client with the obtained key.
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getClient } from "../client.js";
import { formatApiKeys, formatError } from "../formatters.js";

export function registerAuthTools(server: FastMCP): void {
  // ---- Auth flow (unauthenticated) ----

  server.addTool({
    name: "code-fundi-auth-authenticate",
    description:
      "Start a Code-Fundi authentication flow. Supports OTP (email code) or password modes. " +
      "For new users, set should_create_user to true. " +
      "After calling this, use code-fundi-auth-verify to complete the sign-in with the OTP code. " +
      "This tool does NOT require an existing API key.",
    parameters: z.object({
      email: z.string().email().describe("Email address to authenticate"),
      auth_mode: z.enum(["otp", "password"]).describe("Authentication mode: 'otp' for email code, 'password' for password-based"),
      should_create_user: z.boolean().optional().describe("Set to true for new user registration (default: false)"),
      password: z.string().optional().describe("Password (only used when auth_mode is 'password')"),
    }),
    annotations: { title: "Authenticate", readOnlyHint: false, openWorldHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.authAuthenticate({
          email: args.email,
          auth_mode: args.auth_mode,
          should_create_user: args.should_create_user,
          authPassword: args.password,
        });

        const d = res.data;
        const parts: string[] = [];
        parts.push("## Authentication Initiated\n");
        parts.push(`- **User ID:** \`${d.user_id}\``);
        parts.push(`- **Email:** ${d.email}`);
        parts.push(`- **Verification required:** ${d.verification_required}`);

        // Auto-configure if API key returned and active
        if (d.api_key?.key && d.api_key.key_state === "active") {
          client.setApiKey(d.api_key.key);
          parts.push(`\n✅ **API key obtained and configured.** You can now use all Code-Fundi tools.`);
        } else if (d.verification_required) {
          parts.push(
            `\n📧 **An OTP code has been sent to ${d.email}.** ` +
            `Use \`code-fundi-auth-verify\` with the 6-digit code to complete sign-in.`,
          );
        } else if (d.api_key?.key_state === "agent_pending") {
          parts.push(`\n⏳ API key is pending activation. Complete verification to activate.`);
        }

        // If session returned directly (password mode), mention it
        if (d.session?.access_token) {
          parts.push(`\n🔑 Session token obtained.`);
        }

        return parts.join("\n");
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-auth-verify",
    description:
      "Verify a Code-Fundi OTP code to complete authentication. " +
      "Use the 6-digit code sent to the email from code-fundi-auth-authenticate. " +
      "On success, the API key is automatically configured for all subsequent tool calls.",
    parameters: z.object({
      email: z.string().email().describe("Email address used in the authenticate step"),
      token: z.string().min(6).max(6).describe("6-digit OTP verification code"),
    }),
    annotations: { title: "Verify OTP", readOnlyHint: false },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.authVerify({ email: args.email, token: args.token });
        const d = res.data;

        const parts: string[] = [];
        parts.push("## Verification Successful\n");
        parts.push(`- **User ID:** \`${d.user_id}\``);
        parts.push(`- **Email:** ${d.email}`);

        if (d.api_key?.key) {
          client.setApiKey(d.api_key.key);
          parts.push(`\n✅ **API key activated and configured.** All Code-Fundi tools are now available.`);
          parts.push(`- **Key state:** ${d.api_key.key_state}`);
        } else {
          parts.push(`\n⚠️ No API key returned. You may need to generate one via code-fundi-regenerate-api-key.`);
        }

        if (d.session?.access_token) {
          parts.push(`\n🔑 Session token obtained (expires in ${d.session.expires_in ?? "?"}s).`);
        }

        return parts.join("\n");
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-auth-resend",
    description: "Resend the OTP verification email if the previous one expired or wasn't received.",
    parameters: z.object({
      email: z.string().email().describe("Email address to resend the code to"),
      type: z.enum(["signup", "email_change", "email"]).optional().describe("Resend type (default: signup)"),
    }),
    annotations: { title: "Resend OTP", readOnlyHint: false },
    execute: async (args) => {
      try {
        const client = getClient();
        await client.authResend({ email: args.email, type: args.type });
        return `📧 Verification code resent to **${args.email}**. Use \`code-fundi-auth-verify\` with the new code.`;
      } catch (err) { return formatError(err); }
    },
  });

  // ---- API Keys (authenticated) ----

  server.addTool({
    name: "code-fundi-list-api-keys",
    description: "List all Code-Fundi API keys (masked) for the authenticated account.",
    parameters: z.object({}),
    annotations: { title: "List API Keys", readOnlyHint: true },
    execute: async () => {
      try {
        const client = getClient();
        const res = await client.listApiKeys();
        return formatApiKeys(res.data || []);
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-regenerate-api-key",
    description:
      "Regenerate the Code-Fundi API key. The full key is shown only once. " +
      "The new key is automatically configured for all subsequent tool calls.",
    parameters: z.object({}),
    annotations: { title: "Regenerate API Key", readOnlyHint: false, destructiveHint: true },
    execute: async () => {
      try {
        const client = getClient();
        const res = await client.regenerateApiKey();
        if (res.data?.key) {
          client.setApiKey(res.data.key);
          return (
            `## API Key Regenerated\n\n` +
            `✅ New key configured and active.\n\n` +
            `- **Key:** \`${res.data.key}\`\n` +
            `- **ID:** \`${res.data.id}\`\n\n` +
            `> ⚠️ **Save this key** — it won't be shown again.`
          );
        }
        return res.message || "Key regenerated.";
      } catch (err) { return formatError(err); }
    },
  });

  server.addTool({
    name: "code-fundi-disable-api-key",
    description:
      "Disable a Code-Fundi API key by UUID (`DELETE /v2/keys/{key_id}`). " +
      "Use `code-fundi-list-api-keys` to find key IDs. Does not rotate the active key unless you disable the one in use.",
    parameters: z.object({
      key_id: z.string().uuid().describe("API key UUID to disable"),
    }),
    annotations: { title: "Disable API Key", readOnlyHint: false, destructiveHint: true },
    execute: async (args) => {
      try {
        const client = getClient();
        const res = await client.deleteApiKey(args.key_id);
        if (res.status === "success" || res.data?.deleted) {
          return res.message || `API key \`${args.key_id}\` disabled.`;
        }
        return res.message || "Disable request completed.";
      } catch (err) { return formatError(err); }
    },
  });
}
