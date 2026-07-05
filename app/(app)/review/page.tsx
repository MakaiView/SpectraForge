import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, recipeStatusBadge } from "@/components/ui/Badge";
import { OUTCOME_META } from "@/components/attempts/AttemptView";

export const metadata = { title: "Needs Review · SpectraForge" };

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

export default async function ReviewPage() {
  const supabase = await createClient();
  const [{ data: recipes }, { data: attempts }] = await Promise.all([
    supabase.from("recipes").select("id, name, material_name, process, status, machines(name)").eq("status", "review").order("created_at", { ascending: false }),
    supabase.from("attempts").select("id, material_name, process, outcome, note, logged_at, machines(name)").in("outcome", ["marginal", "fail"]).order("logged_at", { ascending: false }),
  ]);

  const total = (recipes?.length ?? 0) + (attempts?.length ?? 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Needs Review</h1>
      <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "0 0 22px" }}>Recipes and attempts flagged for a closer look before they earn the calibrated mark.</p>

      {total === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>ALL CLEAR</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 0", maxWidth: 420 }}>Nothing needs review. Recipes set to “Review” status and attempts with a marginal or failed outcome show up here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {(recipes?.length ?? 0) > 0 && (
            <div style={{ ...card, overflow: "hidden" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", padding: "14px 18px 10px" }}>RECIPES · {recipes!.length}</div>
              {recipes!.map((r) => {
                const m = r.machines as { name: string } | null;
                const sb = recipeStatusBadge(r.status);
                return (
                  <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--sf-line)", textDecoration: "none", color: "var(--sf-text)" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--sf-text-2)" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h16M4 12h16M4 19h10" /></svg></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.material_name || r.name}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 2 }}>{[r.process, m?.name].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Badge tone={sb.tone}>{sb.label}</Badge>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                );
              })}
            </div>
          )}

          {(attempts?.length ?? 0) > 0 && (
            <div style={{ ...card, overflow: "hidden" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", padding: "14px 18px 10px" }}>ATTEMPTS TO REVISIT · {attempts!.length}</div>
              {attempts!.map((a) => {
                const m = a.machines as { name: string } | null;
                const om = OUTCOME_META[a.outcome] ?? OUTCOME_META.fail;
                return (
                  <Link key={a.id} href="/attempts" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--sf-line)", textDecoration: "none", color: "var(--sf-text)" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--sf-text-2)" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="8" /></svg></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.material_name || "Attempt"}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[a.process, m?.name, a.note].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Badge tone={om.tone}>{om.label}</Badge>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
