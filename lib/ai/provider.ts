import { resolveAiConfig, type AiConfig } from "@/lib/ai/config";

export interface ChatRequest {
  system?: string;
  user: string;
  /** base64-encoded images (no data: prefix) — Ollama's images array (§4b). */
  images?: string[];
  /** force JSON output for structured responses (§5b). */
  json?: boolean;
  timeoutMs?: number;
}

export type ChatResult = { ok: true; content: string } | { ok: false; error: string; unconfigured?: boolean };

/**
 * Call the configured model via the Ollama chat API. Images are base64-inlined
 * into the request (never a public URL — keeps workshop photos on our server,
 * §4b). SERVER-ONLY: the key never leaves here. Returns the raw message content;
 * callers validate/parse it.
 */
export async function chat(req: ChatRequest, explicitCfg?: AiConfig): Promise<ChatResult> {
  const cfg = explicitCfg ?? (await resolveAiConfig());
  if (!cfg) return { ok: false, error: "AI is not configured.", unconfigured: true };

  const messages: Array<{ role: string; content: string; images?: string[] }> = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  messages.push({ role: "user", content: req.user, ...(req.images?.length ? { images: req.images } : {}) });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 60000);
  try {
    const res = await fetch(`${cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream: false,
        ...(req.json ? { format: "json" } : {}),
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Model request failed (${res.status}). ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content ?? "";
    if (!content) return { ok: false, error: "Empty response from the model." };
    return { ok: true, content };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "The model request timed out." : "Could not reach the model.";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the first JSON value from a model response (handles code fences /
 *  surrounding prose even when `format:json` isn't honored). */
export function extractJson<T = unknown>(content: string): T | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  // Try direct parse, then the first {...} or [...] span.
  for (const s of [candidate, candidate.match(/[[{][\s\S]*[\]}]/)?.[0] ?? ""]) {
    if (!s) continue;
    try {
      return JSON.parse(s) as T;
    } catch {
      /* keep trying */
    }
  }
  return null;
}
