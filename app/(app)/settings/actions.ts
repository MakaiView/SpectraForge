"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveAiConfig } from "@/lib/ai/config";
import { chat } from "@/lib/ai/provider";

export type Result = { ok: true } | { ok: false; error: string };

async function updateSettings(patch: Record<string, unknown>): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("user_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save settings." };
  return { ok: true };
}

export async function saveAppearance(theme: string, accent: string): Promise<Result> {
  return updateSettings({ theme, accent });
}

export async function saveNotifications(n: { calibration: boolean; review: boolean; tips: boolean }): Promise<Result> {
  return updateSettings({ notif_calibration: n.calibration, notif_review: n.review, notif_tips: n.tips });
}

export async function saveCardIdentity(value: string): Promise<Result> {
  return updateSettings({ card_identity: value });
}

export async function setOnboarded(value: boolean): Promise<Result> {
  const res = await updateSettings({ onboarded: value });
  revalidatePath("/", "layout");
  return res;
}

/**
 * Save AI provider config. The api key is only written when a new one is
 * supplied (empty = keep existing); pass clearKey to remove it. The key stays
 * server-side — the Settings page never sends the stored key to the client.
 */
export async function saveAiConfig(input: { provider: string; model: string; base_url: string; api_key?: string; clearKey?: boolean }): Promise<Result> {
  const patch: Record<string, unknown> = {
    ai_provider: input.provider,
    ai_model: input.model.trim(),
    ai_base_url: input.base_url.trim(),
  };
  if (input.clearKey) patch.ai_api_key = "";
  else if (input.api_key && input.api_key.trim()) patch.ai_api_key = input.api_key.trim();
  return updateSettings(patch);
}

/**
 * Test the AI endpoint with a tiny round-trip. Uses the form values when
 * supplied (so you can test before saving), falling back to the saved key/config
 * — all resolved server-side. Verifies base URL + model + key actually work.
 */
export async function testAiConnection(input?: { model?: string; base_url?: string; api_key?: string }): Promise<{ ok: boolean; message: string }> {
  const saved = await resolveAiConfig();
  const baseUrl = (input?.base_url?.trim() || saved?.baseUrl || "").replace(/\/$/, "");
  const model = input?.model?.trim() || saved?.model || "";
  const apiKey = input?.api_key?.trim() || saved?.apiKey || "";
  if (!baseUrl || !model) return { ok: false, message: "Set a base URL and a model first." };

  const res = await chat(
    { system: "You are a connection test. Reply with the single word: ok", user: "ping", timeoutMs: 25000 },
    { baseUrl, apiKey, model }
  );
  if (!res.ok) return { ok: false, message: res.error };
  const reply = res.content.trim().replace(/\s+/g, " ").slice(0, 60);
  return { ok: true, message: `Connected — ${model} replied “${reply}”.` };
}

export async function saveProfile(name: string, company: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!name.trim()) return { ok: false, error: "Name is required." };
  const { error } = await supabase.from("profiles").update({ name: name.trim(), company: company.trim() }).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save your profile." };
  revalidatePath("/", "layout");
  return { ok: true };
}
