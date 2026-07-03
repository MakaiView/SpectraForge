"use client";

import { useState } from "react";
import { Modal, fieldInput, fieldLabel, FormError, ModalButtons } from "@/components/ui/Modal";
import { saveMaterial, type MaterialInput } from "@/app/(app)/materials/actions";

export interface Category {
  id: string;
  name: string;
}

export interface MaterialFormValue {
  id?: string;
  name: string;
  category_id: string | null;
  thickness: string;
  hazard: "low" | "medium" | "high";
  grade: string;
  safe_power: string;
  notes: string;
  safety: string;
}

export function blankMaterial(): MaterialFormValue {
  return { name: "", category_id: null, thickness: "", hazard: "low", grade: "", safe_power: "", notes: "", safety: "" };
}

const HAZARDS: { key: "low" | "medium" | "high"; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const textarea: React.CSSProperties = { ...fieldInput, minHeight: 64, resize: "vertical", fontFamily: "inherit" };

export function MaterialForm({ initial, categories, onClose, onSaved }: { initial: MaterialFormValue; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<MaterialFormValue>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const payload: MaterialInput = { ...v };
    const res = await saveMaterial(payload);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={v.id ? "Edit material" : "New material"} maxWidth={520} footer={<ModalButtons onCancel={onClose} onSave={save} saving={saving} saveLabel={v.id ? "Save changes" : "Add material"} />}>
      <label style={fieldLabel}>Name</label>
      <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Baltic Birch Plywood" style={{ ...fieldInput, marginBottom: 12 }} />

      <div style={{ ...half, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Category</label>
          <select value={v.category_id ?? ""} onChange={(e) => setV({ ...v, category_id: e.target.value || null })} style={{ ...fieldInput, appearance: "auto" }}>
            <option value="">— Uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Thickness</label>
          <input value={v.thickness} onChange={(e) => setV({ ...v, thickness: e.target.value })} placeholder="3–6 mm" style={fieldInput} />
        </div>
      </div>

      <label style={fieldLabel}>Hazard</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {HAZARDS.map((h) => {
          const on = v.hazard === h.key;
          const tone = h.key === "high" ? "var(--sf-danger)" : h.key === "medium" ? "var(--sf-warn)" : "var(--sf-success)";
          return (
            <button key={h.key} type="button" onClick={() => setV({ ...v, hazard: h.key })} style={{ flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: on ? `${tone}22` : "var(--sf-bg)", color: on ? tone : "var(--sf-text-2)", border: `1px solid ${on ? tone : "var(--sf-line-strong)"}` }}>{h.label}</button>
          );
        })}
      </div>

      <div style={{ ...half, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Grade <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
          <input value={v.grade} onChange={(e) => setV({ ...v, grade: e.target.value })} placeholder="BB/BB, void-free core" style={fieldInput} />
        </div>
        <div>
          <label style={fieldLabel}>Safe range <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
          <input value={v.safe_power} onChange={(e) => setV({ ...v, safe_power: e.target.value })} placeholder="80–95% @ CO₂" style={fieldInput} />
        </div>
      </div>

      <label style={fieldLabel}>Notes <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
      <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} style={{ ...textarea, marginBottom: 12 }} />

      <label style={fieldLabel}>Safety <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
      <textarea value={v.safety} onChange={(e) => setV({ ...v, safety: e.target.value })} placeholder="Ventilation, fume notes, do-not-cut warnings…" style={textarea} />

      <FormError message={error} />
    </Modal>
  );
}
