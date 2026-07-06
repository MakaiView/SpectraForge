import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAiConfig } from "@/lib/ai/config";
import { chat } from "@/lib/ai/provider";

// A live liveness check — never cached.
export const dynamic = "force-dynamic";

/**
 * AI health probe for the sidebar status dot. Any signed-in user may call it.
 * Resolves the active config, does a tiny round-trip to the model, and reports
 * reachable / unreachable. The api key never leaves the server (§5).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cfg = await resolveAiConfig();
  if (!cfg) return NextResponse.json({ configured: false, ok: false });

  const res = await chat({ system: "You are a connection test. Reply with the single word: ok", user: "ping", timeoutMs: 15000 }, cfg);
  return NextResponse.json({
    configured: true,
    ok: res.ok,
    model: cfg.model,
    message: res.ok ? "Reachable" : res.error,
  });
}
