"use client";

import { useState } from "react";
import { Modal, fieldInput, fieldLabel, FormError, ModalButtons } from "@/components/ui/Modal";
import { ParamFields } from "@/components/params/ParamFields";
import type { ParamValues } from "@/components/params/ParamReadout";
import type { MachineTypeKey } from "@/lib/params/schema";
import { saveRecipe, type RecipeInput } from "@/app/(app)/recipes/actions";

export interface MachineOption {
  id: string;
  name: string;
  type: MachineTypeKey;
  ranges: Record<string, { min?: number | null; max?: number | null }>;
  addons: string[];
}
export interface MaterialOption {
  id: string;
  name: string;
}

export interface RecipeFormValue {
  id?: string;
  name: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  thickness: string;
  params: ParamValues;
  status: "draft" | "cal" | "review" | "fail";
  notes: string;
  verified_by: string;
}

export function blankRecipe(defaultMachineId: string | null): RecipeFormValue {
  return { name: "", material_id: null, material_name: "", process: "cut", machine_id: defaultMachineId, thickness: "", params: {}, status: "draft", notes: "", verified_by: "" };
}

const PROCESSES: ("cut" | "engrave" | "mark")[] = ["cut", "engrave", "mark"];
const STATUSES: { key: "draft" | "cal" | "review" | "fail"; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "cal", label: "Calibrated" },
  { key: "review", label: "Review" },
  { key: "fail", label: "Fail" },
];
const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const textarea: React.CSSProperties = { ...fieldInput, minHeight: 60, resize: "vertical", fontFamily: "inherit" };

export function RecipeForm({ initial, machines, materials, onClose, onSaved }: { initial: RecipeFormValue; machines: MachineOption[]; materials: MaterialOption[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<RecipeFormValue>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const machine = machines.find((m) => m.id === v.machine_id) || null;

  async function save() {
    setSaving(true);
    setError("");
    const payload: RecipeInput = { ...v };
    const res = await saveRecipe(payload);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  function pickMaterial(id: string) {
    const mat = materials.find((m) => m.id === id);
    setV({ ...v, material_id: id || null, material_name: mat?.name ?? "" });
  }

  return (
    <Modal onClose={onClose} title={v.id ? "Edit recipe" : "New recipe"} maxWidth={560} footer={<ModalButtons onCancel={onClose} onSave={save} saving={saving} saveLabel={v.id ? "Save changes" : "Create recipe"} />}>
      <label style={fieldLabel}>Recipe name</label>
      <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Clean cut-through, no tape" style={{ ...fieldInput, marginBottom: 12 }} />

      <div style={{ ...half, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Material</label>
          <select value={v.material_id ?? ""} onChange={(e) => pickMaterial(e.target.value)} style={{ ...fieldInput, appearance: "auto" }}>
            <option value="">— None —</option>
            {materials.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Machine</label>
          <select value={v.machine_id ?? ""} onChange={(e) => setV({ ...v, machine_id: e.target.value || null })} style={{ ...fieldInput, appearance: "auto" }}>
            <option value="">— None —</option>
            {machines.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
      </div>

      <div style={{ ...half, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Process</label>
          <div style={{ display: "flex", gap: 6 }}>
            {PROCESSES.map((p) => {
              const on = v.process === p;
              return (<button key={p} type="button" onClick={() => setV({ ...v, process: p })} style={{ flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", textTransform: "capitalize", fontSize: 12.5, fontWeight: 600, background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: on ? "var(--sf-accent)" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>{p}</button>);
            })}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Thickness</label>
          <input value={v.thickness} onChange={(e) => setV({ ...v, thickness: e.target.value })} placeholder="3.0 mm" style={fieldInput} />
        </div>
      </div>

      {/* Type-aware parameters — driven by the selected machine's type + ranges */}
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "6px 0 10px" }}>PARAMETERS</div>
      {machine ? (
        <ParamFields type={machine.type} params={v.params} ranges={machine.ranges} onChange={(next) => setV({ ...v, params: next })} />
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--sf-text-3)", margin: "0 0 6px" }}>Select a machine to enter its type-specific parameters.</p>
      )}

      <div style={{ ...half, marginTop: 14, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Status</label>
          <select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as RecipeFormValue["status"] })} style={{ ...fieldInput, appearance: "auto" }}>
            {STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Verified by <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
          <input value={v.verified_by} onChange={(e) => setV({ ...v, verified_by: e.target.value })} placeholder="Your name" style={fieldInput} />
        </div>
      </div>

      <label style={fieldLabel}>Notes <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
      <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} style={textarea} />

      <FormError message={error} />
    </Modal>
  );
}
