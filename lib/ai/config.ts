import { createClient } from "@/lib/supabase/server";

/**
 * AI provider config — SERVER-ONLY (BUILD_SPEC §5). Resolved per-user from the
 * user_settings row (set in Settings → AI & Integrations), falling back to env.
 * The model is ONE config value, never hardcoded. The api key is read here on
 * the server and never sent to the browser.
 */
export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function fromEnv(): AiConfig | null {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "").trim().replace(/\/$/, "");
  const apiKey = (process.env.OLLAMA_API_KEY || "").trim();
  const model = (process.env.OLLAMA_MODEL || "").trim();
  if (!baseUrl || !model) return null; // apiKey optional (self-hosted Ollama)
  return { baseUrl, apiKey, model };
}

/** Resolve the active config for the signed-in user (DB first, then env). */
export async function resolveAiConfig(): Promise<AiConfig | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("user_settings").select("ai_base_url, ai_model, ai_api_key").eq("id", user.id).single();
      if (data?.ai_base_url && data.ai_model) {
        return { baseUrl: data.ai_base_url.trim().replace(/\/$/, ""), apiKey: (data.ai_api_key || "").trim(), model: data.ai_model.trim() };
      }
    }
  } catch {
    /* fall through to env */
  }
  return fromEnv();
}

export async function isAiConfigured(): Promise<boolean> {
  return (await resolveAiConfig()) !== null;
}
