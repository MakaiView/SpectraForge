"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, recipeStatusBadge } from "@/components/ui/Badge";
import { paramSummary, type ParamValues } from "@/components/params/ParamReadout";
import { RecipeForm, blankRecipe, type RecipeFormValue, type MachineOption, type MaterialOption } from "@/components/recipes/RecipeForm";
import { toggleFavorite } from "@/app/(app)/recipes/actions";
import { useActiveMachine } from "@/components/shell/ActiveMachineProvider";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface RecipeListItem {
  id: string;
  name: string;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machineName: string | null;
  machineType: MachineTypeKey | null;
  thickness: string;
  params: ParamValues;
  status: string;
  attempts: number;
  favorite: boolean;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

const PROCESS_FILTERS = [
  { key: "all", label: "All" },
  { key: "cut", label: "Cut" },
  { key: "engrave", label: "Engrave" },
  { key: "mark", label: "Mark" },
];
const STATUS_FILTERS = [
  { key: "any", label: "Any" },
  { key: "cal", label: "Calibrated" },
  { key: "review", label: "Review" },
  { key: "draft", label: "Draft" },
];

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="font-mono" style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", background: active ? "var(--sf-accent-soft)" : "transparent", color: active ? "var(--sf-accent)" : "var(--sf-text-3)", border: `1px solid ${active ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>{label}</button>
  );
}

export function RecipesScreen({ recipes, machines, materials, defaultMachineId, favoritesOnly }: { recipes: RecipeListItem[]; machines: MachineOption[]; materials: MaterialOption[]; defaultMachineId: string | null; favoritesOnly?: boolean }) {
  const router = useRouter();
  const { active } = useActiveMachine();
  const [form, setForm] = useState<RecipeFormValue | null>(null);
  const [proc, setProc] = useState("all");
  const [status, setStatus] = useState("any");

  // Prefill new recipes with the active machine (README §Machine context),
  // falling back to the server-provided default.
  const newRecipeMachineId = active?.id ?? defaultMachineId;

  const filtered = useMemo(
    () => recipes.filter((r) => (proc === "all" || r.process === proc) && (status === "any" || r.status === status)),
    [recipes, proc, status]
  );

  async function onStar(e: React.MouseEvent, r: RecipeListItem) {
    e.stopPropagation();
    await toggleFavorite(r.id, !r.favorite);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>{favoritesOnly ? "Favorites" : "Recipes"}</h1>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0 }}>{filtered.length} shown · proven settings, type-aware to each machine.</p>
        </div>
        <button onClick={() => setForm(blankRecipe(newRecipeMachineId))} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New recipe
        </button>
      </div>

      {!favoritesOnly && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>{PROCESS_FILTERS.map((f) => <Chip key={f.key} active={proc === f.key} label={f.label} onClick={() => setProc(f.key)} />)}</div>
          <div style={{ display: "flex", gap: 6 }}>{STATUS_FILTERS.map((f) => <Chip key={f.key} active={status === f.key} label={f.label} onClick={() => setStatus(f.key)} />)}</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>{recipes.length === 0 ? "NO RECIPES YET" : "NOTHING MATCHES"}</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 18px", maxWidth: 420 }}>{recipes.length === 0 ? "Document a proven settings set for a material + machine + process — or promote one from the Calibration Lab." : "No recipes match these filters."}</p>
          {recipes.length === 0 && <button onClick={() => setForm(blankRecipe(newRecipeMachineId))} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Create your first recipe</button>}
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {filtered.map((r) => {
            const sb = recipeStatusBadge(r.status);
            const summary = r.machineType ? paramSummary(r.machineType, r.params) : "";
            return (
              <div key={r.id} onClick={() => router.push(`/recipes/${r.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: "1px solid var(--sf-line)", cursor: "pointer" }}>
                <button onClick={(e) => onStar(e, r)} aria-label="Favorite" style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", padding: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={r.favorite ? "var(--sf-warn)" : "none"} stroke={r.favorite ? "var(--sf-warn)" : "var(--sf-text-3)"} strokeWidth="1.7"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" /></svg>
                </button>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h16M4 12h16M4 19h10" /></svg>
                </span>
                <div style={{ minWidth: 120, flex: "1 1 200px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.material_name || r.name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[r.process, r.machineName, r.thickness].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="font-mono sf-tophide" style={{ fontSize: 12, color: "var(--sf-text-2)", flex: "0 1 270px", maxWidth: 270, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</div>
                <div className="font-mono sf-tophide" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 62, textAlign: "right" }}>{r.attempts} att</div>
                <div style={{ flex: "none", width: 110, textAlign: "right" }}><Badge tone={sb.tone}>{sb.label}</Badge></div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
              </div>
            );
          })}
        </div>
      )}

      {form && <RecipeForm initial={form} machines={machines} materials={materials} onClose={() => setForm(null)} onSaved={() => { setForm(null); router.refresh(); }} />}
    </div>
  );
}
