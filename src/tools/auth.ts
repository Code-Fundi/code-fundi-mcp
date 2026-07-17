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
      "Start Code-Fundi authentication (POST /v2/auth/authenticate). No existing API key required. " +
      "Use auth_mode otp for new or returning users: set should_create_user true on first signup, false on sign-in. " +
      "Sends a 6-digit email OTP (not a magic link); then call code-fundi-auth-verify after the human user provides the code. " +
      "Password mode: pass password here (sent as X-CodeFundi-Auth-Password header only); should_create_user false for sign-in. " +
      "On success with an active key, the API key is configured in-memory for this MCP session only.",
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
      "Complete OTP sign-in (POST /v2/auth/verify). Requires the 6-digit code from the user's email after code-fundi-auth-authenticate. " +
      "The human user must supply the token — ask them explicitly. " +
      "On success, activates the API key and configures it in-memory for all subsequent tools in this MCP session. " +
      "Persist CODEFUNDI_API_KEY in MCP config if the user wants auth to survive restarts.",
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
    description:
      "Resend the OTP email (POST /v2/auth/resend) when the previous code expired or was not received. " +
      "Use after code-fundi-auth-authenticate, before code-fundi-auth-verify. Default type is signup for new accounts.",
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
