"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, hazardBadge } from "@/components/ui/Badge";
import { MaterialForm, blankMaterial, type MaterialFormValue, type Category } from "@/components/materials/MaterialForm";
import { CategoryManager } from "@/components/materials/CategoryManager";

export interface MaterialListItem {
  id: string;
  name: string;
  categoryName: string | null;
  category_id: string | null;
  thickness: string;
  hazard: "low" | "medium" | "high";
  grade: string;
  safe_power: string;
  notes: string;
  safety: string;
  recipeCount: number;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };
const secondaryBtn: React.CSSProperties = { height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" };

export function MaterialsScreen({ materials, categories }: { materials: MaterialListItem[]; categories: Category[] }) {
  const router = useRouter();
  const [form, setForm] = useState<MaterialFormValue | null>(null);
  const [managing, setManaging] = useState(false);

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Materials</h1>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0 }}>
            {materials.length} material{materials.length === 1 ? "" : "s"} · safe ranges, hazards, and the recipes documented against each.
          </p>
        </div>
        <button onClick={() => setManaging(true)} style={secondaryBtn}>Categories</button>
        <button onClick={() => setForm(blankMaterial())} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New material
        </button>
      </div>

      {materials.length === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>NO MATERIALS YET</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 18px", maxWidth: 420 }}>Add the stock you work with — its category, thickness, hazard level and safe ranges — so recipes and calibration have something to key off.</p>
          <button onClick={() => setForm(blankMaterial())} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Add your first material</button>
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {materials.map((m) => {
            const hb = hazardBadge(m.hazard);
            return (
              <button key={m.id} onClick={() => router.push(`/materials/${m.id}`)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 18px", borderBottom: "1px solid var(--sf-line)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--sf-text)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 3v18M4 7.5l8 4.5 8-4.5" /></svg>
                </span>
                <div style={{ minWidth: 120, flex: "1 1 220px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--sf-text-3)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[m.categoryName || "Uncategorized", m.grade].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="font-mono sf-tophide" style={{ fontSize: 11.5, color: "var(--sf-text-3)", width: 90, textAlign: "right" }}>{m.thickness || "—"}</div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 78, textAlign: "right" }}>{m.recipeCount} recipe{m.recipeCount === 1 ? "" : "s"}</div>
                <div style={{ flex: "none", width: 118, textAlign: "right" }}><Badge tone={hb.tone}>{hb.label}</Badge></div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
              </button>
            );
          })}
        </div>
      )}

      {form && <MaterialForm initial={form} categories={categories} onClose={() => setForm(null)} onSaved={() => { setForm(null); router.refresh(); }} />}
      {managing && <CategoryManager categories={categories} onClose={() => setManaging(false)} />}
    </div>
  );
}
