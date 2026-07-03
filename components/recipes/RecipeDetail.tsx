"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, recipeStatusBadge, hazardBadge } from "@/components/ui/Badge";
import { ParamReadout, type ParamValues } from "@/components/params/ParamReadout";
import { RecipeForm, type RecipeFormValue, type MachineOption, type MaterialOption } from "@/components/recipes/RecipeForm";
import { deleteRecipe, toggleFavorite } from "@/app/(app)/recipes/actions";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface RecipeDetailData {
  id: string;
  name: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  machineName: string | null;
  machineType: MachineTypeKey | null;
  materialGrade: string;
  materialHazard: string | null;
  thickness: string;
  params: ParamValues;
  status: string;
  attempts: number;
  notes: string;
  verified_by: string;
  last_verified: string;
  favorite: boolean;
  calRunId: string | null;
  calTests: number | null;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--sf-line)", alignItems: "center" }}>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--sf-text-3)", width: 92, flex: "none" }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--sf-text)" }}>{value}</span>
    </div>
  );
}

export function RecipeDetail({ recipe, machines, materials }: { recipe: RecipeDetailData; machines: MachineOption[]; materials: MaterialOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const sb = recipeStatusBadge(recipe.status);

  async function onDelete() {
    if (!confirm(`Delete “${recipe.name}”?`)) return;
    setBusy(true);
    const res = await deleteRecipe(recipe.id);
    if (res.ok) router.push("/recipes");
    else setBusy(false);
  }

  async function onStar() {
    await toggleFavorite(recipe.id, !recipe.favorite);
    router.refresh();
  }

  const editValue: RecipeFormValue = {
    id: recipe.id,
    name: recipe.name,
    material_id: recipe.material_id,
    material_name: recipe.material_name,
    process: recipe.process,
    machine_id: recipe.machine_id,
    thickness: recipe.thickness,
    params: recipe.params,
    status: recipe.status as RecipeFormValue["status"],
    notes: recipe.notes,
    verified_by: recipe.verified_by,
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/recipes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--sf-text-2)", textDecoration: "none", marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 6l-6 6 6 6" /></svg>
        Recipes
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--sf-text-3)", marginBottom: 6 }}>{recipe.material_name || "No material"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <h1 className="font-display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{recipe.name}</h1>
            <Badge tone={sb.tone}>{sb.label}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button onClick={onStar} aria-label="Favorite" style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={recipe.favorite ? "var(--sf-warn)" : "none"} stroke={recipe.favorite ? "var(--sf-warn)" : "var(--sf-text-2)"} strokeWidth="1.7"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" /></svg>
          </button>
          <button onClick={() => setEditing(true)} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
          <button onClick={onDelete} disabled={busy} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-danger)", background: "var(--sf-danger-soft)", color: "var(--sf-danger)", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>Delete</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="sf-grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 14 }}>PARAMETERS</div>
            {recipe.machineType ? (
              <ParamReadout type={recipe.machineType} params={recipe.params} />
            ) : (
              <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No machine linked — assign one to see type-aware parameters.</p>
            )}
          </div>

          {recipe.notes && (
            <div style={{ ...card, padding: "18px 20px" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 8 }}>NOTES</div>
              <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0, lineHeight: 1.5 }}>{recipe.notes}</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 4 }}>DETAILS</div>
            <MetaRow label="MACHINE" value={recipe.machineName || "—"} />
            <MetaRow label="PROCESS" value={<span style={{ textTransform: "capitalize" }}>{recipe.process}</span>} />
            <MetaRow label="THICKNESS" value={recipe.thickness || "—"} />
            <MetaRow label="GRADE" value={recipe.materialGrade || "—"} />
            <MetaRow label="HAZARD" value={recipe.materialHazard ? <Badge tone={hazardBadge(recipe.materialHazard).tone}>{hazardBadge(recipe.materialHazard).label}</Badge> : "—"} />
            <MetaRow label="ATTEMPTS" value={String(recipe.attempts)} />
            <MetaRow label="VERIFIED BY" value={recipe.verified_by || "—"} />
          </div>

          {/* Provenance chip — set when promoted from a calibration run (Phase 5) */}
          {recipe.calRunId && (
            <Link href={`/calibration/${recipe.calRunId}`} style={{ ...card, padding: "13px 16px", display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--sf-accent)", background: "var(--sf-accent-soft)", borderColor: "var(--sf-accent)" }}>
              <span style={{ fontSize: 15 }}>⟿</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Calibrated in the Lab · {recipe.calTests ?? 0} test grid{recipe.calTests === 1 ? "" : "s"}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "auto" }}><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          )}

          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>RESULT PHOTO</div>
            <div style={{ border: "1px dashed var(--sf-line-strong)", borderRadius: 10, padding: "34px 16px", textAlign: "center", color: "var(--sf-text-3)", fontSize: 12.5 }}>Photo + share-card land with Storage in a later phase.</div>
          </div>
        </div>
      </div>

      {editing && <RecipeForm initial={editValue} machines={machines} materials={materials} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </div>
  );
}
