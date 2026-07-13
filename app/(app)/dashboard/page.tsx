import Link from "next/link";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge, recipeStatusBadge } from "@/components/ui/Badge";
import { MachineTypeDot } from "@/components/machines/MachineTypeChip";
import { paramSummary, type ParamValues } from "@/components/params/ParamReadout";
import { OUTCOME_META } from "@/components/attempts/AttemptView";
import { isAiConfigured } from "@/lib/ai/config";
import type { MachineTypeKey } from "@/lib/params/schema";

export const metadata = { title: "Dashboard · SpectraForge" };

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

export default async function DashboardPage() {
  const profile = await getProfile();
  const firstName = (profile?.name || "").trim().split(/\s+/)[0] || "there";
  const supabase = await createClient();

  const [recipes, materials, attempts, calRuns, reviewRecipes, marginalAttempts, recentRecipes, recentAttempts, machines, aiConfigured] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("materials").select("id", { count: "exact", head: true }),
    supabase.from("attempts").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "cal"),
    supabase.from("recipes").select("*, machines(name, type)").eq("status", "review").order("created_at", { ascending: false }).limit(4),
    supabase.from("attempts").select("id", { count: "exact", head: true }).in("outcome", ["possible", "bad", "fail"]),
    supabase.from("recipes").select("id, name, material_name, status, params, created_at, machines(name, type)").order("created_at", { ascending: false }).limit(6),
    supabase.from("attempts").select("id, material_name, outcome, created_at, machines(name, type)").order("created_at", { ascending: false }).limit(6),
    supabase.from("machines").select("id, name, type, recipes(count)").order("created_at", { ascending: true }),
    isAiConfigured(),
  ]);

  const recipeCount = recipes.count ?? 0;
  const calRate = recipeCount ? Math.round(((calRuns.count ?? 0) / recipeCount) * 100) : 0;
  const needsReview = (reviewRecipes.data?.length ?? 0) + (marginalAttempts.count ?? 0);

  // Merge recent recipes + attempts into one activity feed.
  type Activity = { key: string; title: string; sub: string; iso: string; badge: React.ReactNode; icon: "recipe" | "attempt" };
  const activity: Activity[] = [];
  for (const r of recentRecipes.data ?? []) {
    const m = r.machines as { name: string; type: string } | null;
    const sb = recipeStatusBadge(r.status);
    const summary = m ? paramSummary(m.type as MachineTypeKey, (r.params as ParamValues) ?? {}) : "";
    activity.push({ key: `r${r.id}`, title: r.material_name || r.name, sub: `${summary || r.name} · ${m?.name ?? "—"}`, iso: r.created_at, badge: <Badge tone={sb.tone}>{sb.label}</Badge>, icon: "recipe" });
  }
  for (const a of recentAttempts.data ?? []) {
    const om = OUTCOME_META[a.outcome] ?? OUTCOME_META.great;
    const m = a.machines as { name: string } | null;
    activity.push({ key: `a${a.id}`, title: a.material_name || "Attempt", sub: `Attempt · ${m?.name ?? "—"}`, iso: a.created_at, badge: <Badge tone={om.tone}>{om.label}</Badge>, icon: "attempt" });
  }
  activity.sort((x, y) => +new Date(y.iso) - +new Date(x.iso));
  const feed = activity.slice(0, 7);

  const metrics = [
    { label: "RECIPES", value: recipeCount.toLocaleString(), href: "/recipes" },
    { label: "MATERIALS", value: (materials.count ?? 0).toLocaleString(), href: "/materials" },
    { label: "CALIBRATION RATE", value: `${calRate}%`, href: "/calibration" },
    { label: "NEEDS REVIEW", value: needsReview.toLocaleString(), href: "/review", warn: needsReview > 0 },
    { label: "ATTEMPTS LOGGED", value: (attempts.count ?? 0).toLocaleString(), href: "/attempts" },
  ];

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>{greeting()}, {firstName}</h1>
      <p style={{ fontSize: 14.5, color: "var(--sf-text-2)", margin: "0 0 26px" }}>Turn experiments into expertise — document what works, calibrate what doesn&apos;t.</p>

      {/* Metric strip */}
      <div className="sf-metrics" style={{ display: "flex", gap: 14, marginBottom: 26 }}>
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} style={{ ...card, flex: "1 1 0", padding: "16px 18px", textDecoration: "none", color: "var(--sf-text)" }}>
            <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--sf-text-3)" }}>{m.label}</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color: m.warn ? "var(--sf-warn)" : "var(--sf-text)" }}>{m.value}</div>
          </Link>
        ))}
      </div>

      {/* 2-column */}
      <div className="sf-grid2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        {/* Recent activity */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", flex: 1 }}>RECENT ACTIVITY</div>
            <Link href="/recipes" style={{ fontSize: 12, color: "var(--sf-accent)", textDecoration: "none" }}>All recipes →</Link>
          </div>
          {feed.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: "8px 0" }}>Nothing yet — add a machine, then a recipe or attempt.</p>
          ) : (
            feed.map((it, i) => (
              <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--sf-line)" }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--sf-text-2)" }}>
                  {it.icon === "recipe" ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16M4 12h16M4 19h10" /></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="8" /></svg>}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div>
                </div>
                {it.badge}
                <span style={{ fontSize: 11, color: "var(--sf-text-3)", width: 62, textAlign: "right", flex: "none" }}>{relTime(it.iso)}</span>
              </div>
            ))
          )}
        </div>

        {/* Right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Needs review */}
          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>NEEDS REVIEW</div>
            {(reviewRecipes.data?.length ?? 0) === 0 ? (
              <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>Nothing flagged for review.</p>
            ) : (
              (reviewRecipes.data ?? []).map((r) => (
                <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: "1px solid var(--sf-line)", textDecoration: "none", color: "var(--sf-text)" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.material_name || r.name}</span>
                  <Badge tone="warn">Review</Badge>
                </Link>
              ))
            )}
          </div>

          {/* AI setup prompt — only until the assistant is configured */}
          {!aiConfigured && (
            <div style={{ ...card, padding: "18px 20px", background: "var(--sf-accent-soft)", borderColor: "var(--sf-accent)", overflow: "hidden", position: "relative" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-accent)", marginBottom: 8 }}>AI GUIDANCE</div>
              <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: "0 0 14px", lineHeight: 1.5 }}>Grade calibration sheets from a photo and get suggested starting settings, grounded in your baselines.</p>
              <Link href="/settings" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 14px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
                Set up AI
              </Link>
            </div>
          )}

          {/* Machines mini-list */}
          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", flex: 1 }}>MACHINES</div>
              <Link href="/machines" style={{ fontSize: 12, color: "var(--sf-accent)", textDecoration: "none" }}>Manage →</Link>
            </div>
            {(machines.data?.length ?? 0) === 0 ? (
              <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No machines yet.</p>
            ) : (
              (machines.data ?? []).map((m, i) => (
                <Link key={m.id} href={`/machines/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--sf-line)", textDecoration: "none", color: "var(--sf-text)" }}>
                  <MachineTypeDot type={m.type as MachineTypeKey} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                  <span className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)" }}>{Array.isArray(m.recipes) && m.recipes[0] ? (m.recipes[0] as { count: number }).count : 0} rec</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
