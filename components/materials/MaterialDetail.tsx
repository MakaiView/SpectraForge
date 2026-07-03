"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, hazardBadge, recipeStatusBadge } from "@/components/ui/Badge";
import { MaterialForm, type MaterialFormValue, type Category } from "@/components/materials/MaterialForm";
import { deleteMaterial } from "@/app/(app)/materials/actions";

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

interface RecipeLite {
  id: string;
  name: string;
  process: string;
  status: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--sf-line)" }}>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--sf-text-3)", width: 96, flex: "none", paddingTop: 2 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--sf-text)" }}>{value || "—"}</span>
    </div>
  );
}

export function MaterialDetail({ material, categoryName, categories, recipes }: { material: MaterialFormValue; categoryName: string | null; categories: Category[]; recipes: RecipeLite[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const hb = hazardBadge(material.hazard);

  async function onDelete() {
    if (!material.id) return;
    if (!confirm(`Delete “${material.name}”?`)) return;
    setBusy(true);
    const res = await deleteMaterial(material.id);
    if (res.ok) router.push("/materials");
    else setBusy(false);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/materials" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--sf-text-2)", textDecoration: "none", marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 6l-6 6 6 6" /></svg>
        Materials
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{material.name}</h1>
            <Badge tone={hb.tone}>{hb.label}</Badge>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "7px 0 0" }}>
            {[categoryName || "Uncategorized", material.thickness].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button onClick={() => setEditing(true)} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
          <button onClick={onDelete} disabled={busy} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-danger)", background: "var(--sf-danger-soft)", color: "var(--sf-danger)", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>Delete</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="sf-grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 4 }}>SPECIFICATIONS</div>
            <InfoRow label="CATEGORY" value={categoryName || "Uncategorized"} />
            <InfoRow label="THICKNESS" value={material.thickness} />
            <InfoRow label="GRADE" value={material.grade} />
            <InfoRow label="SAFE RANGE" value={material.safe_power} />
            <InfoRow label="HAZARD" value={hb.label} />
          </div>

          {(material.notes || material.safety) && (
            <div style={{ ...card, padding: "18px 20px" }}>
              {material.notes && (
                <>
                  <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 8 }}>NOTES</div>
                  <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "0 0 14px", lineHeight: 1.5 }}>{material.notes}</p>
                </>
              )}
              {material.safety && (
                <>
                  <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-warn)", marginBottom: 8 }}>SAFETY</div>
                  <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0, lineHeight: 1.5 }}>{material.safety}</p>
                </>
              )}
            </div>
          )}

          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>DOCUMENTED RECIPES · {recipes.length}</div>
            {recipes.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No recipes documented against this material yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recipes.map((r) => {
                  const sb = recipeStatusBadge(r.status);
                  return (
                    <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--sf-line)", textDecoration: "none", color: "var(--sf-text)" }}>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{r.name}</span>
                      <span className="font-mono" style={{ fontSize: 10.5, color: "var(--sf-text-3)", textTransform: "uppercase" }}>{r.process}</span>
                      <Badge tone={sb.tone}>{sb.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Reference photo slot (Storage wired in a later phase) */}
        <div style={{ ...card, padding: "18px 20px", alignSelf: "start" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>REFERENCE PHOTO</div>
          <div style={{ border: "1px dashed var(--sf-line-strong)", borderRadius: 10, padding: "38px 16px", textAlign: "center", color: "var(--sf-text-3)", fontSize: 12.5 }}>
            Photo upload lands with Storage in a later phase.
          </div>
        </div>
      </div>

      {editing && <MaterialForm initial={material} categories={categories} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </div>
  );
}
