import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsScreen, type SettingsData } from "@/components/settings/SettingsScreen";
import type { Category } from "@/components/materials/MaterialForm";

export const metadata = { title: "Settings · SpectraForge" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: s }, { data: cats }] = await Promise.all([
    supabase.from("user_settings").select("*").eq("id", user.id).single(),
    supabase.from("material_categories").select("id, name").order("position", { ascending: true }),
  ]);

  // NEVER pass the raw api key to the client — only whether one is set (§5).
  const settings: SettingsData = {
    theme: s?.theme ?? "dark",
    accent: s?.accent ?? "azure",
    ai_provider: s?.ai_provider ?? "ollama",
    ai_model: s?.ai_model ?? "",
    ai_base_url: s?.ai_base_url ?? "",
    hasApiKey: !!(s?.ai_api_key && s.ai_api_key.length > 0),
    notif_calibration: s?.notif_calibration ?? true,
    notif_review: s?.notif_review ?? true,
    notif_tips: s?.notif_tips ?? false,
    card_identity: s?.card_identity ?? "both",
  };

  return <SettingsScreen settings={settings} categories={(cats ?? []) as Category[]} />;
}
