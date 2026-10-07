import type { ChatResponse } from "./types.js";

export const FUNDI_CHAT_BOUNDARY = "code-fundi-res-split";

/**
 * Parse `/v1/fundi/chat` multipart (`boundary=code-fundi-res-split`) or HTML.
 * Keeps text/html and text/plain parts; ignores audio octet-stream.
 */
export function parseFundiChatBody(body: string, contentType: string): ChatResponse {
  const ct = (contentType || "").toLowerCase();
  const raw = body || "";
  if (ct.includes("application/json") && !raw.includes(FUNDI_CHAT_BOUNDARY)) {
    try {
      return JSON.parse(raw) as ChatResponse;
    } catch {
      return { status: "success", response: raw };
    }
  }
  if (!raw.includes(FUNDI_CHAT_BOUNDARY) && !ct.includes("multipart")) {
    return { status: "success", response: raw.replace(/\r\n/g, "\n").trim() };
  }
  const parts = raw.split(`--${FUNDI_CHAT_BOUNDARY}`);
  const htmlChunks: string[] = [];
  let conversationId: string | undefined;
  let model: string | undefined;
  for (const part of parts) {
    const trimmed = part.replace(/^[\s-]+/, "").trim();
    if (!trimmed || trimmed === "--") continue;
    const splitAt = trimmed.search(/\r?\n\r?\n/);
    const headerBlock = splitAt >= 0 ? trimmed.slice(0, splitAt) : "";
    const payload =
      splitAt >= 0
        ? trimmed.slice(splitAt).replace(/^\r?\n\r?\n/, "").replace(/^\r?\n/, "")
        : trimmed;
    const partCt = /content-type:\s*([^\r\n;]+)/i.exec(headerBlock)?.[1]?.toLowerCase() || "";
    if (partCt.includes("application/json") || (!partCt && payload.trim().startsWith("{"))) {
      try {
        const json = JSON.parse(payload.trim()) as Record<string, unknown>;
        if (typeof json.conversation_id === "string") conversationId = json.conversation_id;
        if (typeof json.model === "string") model = json.model;
        if (typeof json.response === "string") htmlChunks.push(json.response);
      } catch {
        /* ignore malformed JSON part */
      }
      continue;
    }
    if (partCt.includes("octet-stream") || partCt.includes("audio")) continue;
    if (!partCt || partCt.includes("text/html") || partCt.includes("text/plain")) {
      htmlChunks.push(payload.replace(/\r\n/g, "\n"));
    }
  }
  const response = htmlChunks.join("").replace(/--code-fundi-res-split/g, "").trim();
  return {
    status: "success",
    response,
    conversation_id: conversationId,
    model,
  };
}
