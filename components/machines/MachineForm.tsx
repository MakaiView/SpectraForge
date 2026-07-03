"use client";

import { useState } from "react";
import { Modal, fieldInput, fieldLabel, FormError, ModalButtons } from "@/components/ui/Modal";
import { RangeEditor, type Ranges } from "@/components/params/RangeEditor";
import { MACHINE_TYPES, ADDONS, type MachineTypeKey } from "@/lib/params/schema";
import { saveMachine, type MachineInput } from "@/app/(app)/machines/actions";

export interface MachineFormValue {
  id?: string;
  name: string;
  manufacturer: string;
  model: string;
  type: MachineTypeKey;
  watts: number | null;
  bed_w: number | null;
  bed_h: number | null;
  lens: string;
  addons: string[];
  ranges: Ranges;
}

export function blankMachine(): MachineFormValue {
  return { name: "", manufacturer: "", model: "", type: "co2", watts: null, bed_w: null, bed_h: null, lens: "", addons: [], ranges: {} };
}

const TYPE_KEYS = Object.keys(MACHINE_TYPES) as MachineTypeKey[];

const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

export function MachineForm({ initial, onClose, onSaved }: { initial: MachineFormValue; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<MachineFormValue>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleAddon(id: string) {
    setV((s) => ({ ...s, addons: s.addons.includes(id) ? s.addons.filter((a) => a !== id) : [...s.addons, id] }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload: MachineInput = {
      id: v.id,
      name: v.name,
      manufacturer: v.manufacturer,
      model: v.model,
      type: v.type,
      watts: v.watts ?? 0,
      bed_w: v.bed_w ?? 0,
      bed_h: v.bed_h ?? 0,
      lens: v.lens,
      addons: v.addons,
      ranges: v.ranges,
    };
    const res = await saveMachine(payload);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  const numField = (label: string, key: "watts" | "bed_w" | "bed_h", suffix: string) => (
    <div>
      <label style={fieldLabel}>
        {label} <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>{suffix}</span>
      </label>
      <input type="number" value={v[key] ?? ""} onChange={(e) => setV({ ...v, [key]: e.target.value === "" ? null : Number(e.target.value) })} style={fieldInput} />
    </div>
  );

  return (
    <Modal
      onClose={onClose}
      title={v.id ? "Edit machine" : "New machine"}
      maxWidth={560}
      footer={<ModalButtons onCancel={onClose} onSave={save} saving={saving} saveLabel={v.id ? "Save changes" : "Add machine"} />}
    >
      <label style={fieldLabel}>Name</label>
      <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Aurora" style={{ ...fieldInput, marginBottom: 12 }} />

      <div style={{ ...half, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Manufacturer</label>
          <input value={v.manufacturer} onChange={(e) => setV({ ...v, manufacturer: e.target.value })} placeholder="OMTech" style={fieldInput} />
        </div>
        <div>
          <label style={fieldLabel}>Model</label>
          <input value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} placeholder="AF2028-100" style={fieldInput} />
        </div>
      </div>

      {/* Type selector — swaps which range fields appear */}
      <label style={fieldLabel}>Laser type</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {TYPE_KEYS.map((k) => {
          const t = MACHINE_TYPES[k];
          const active = v.type === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setV({ ...v, type: k })}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? `${t.accent}22` : "var(--sf-bg)", color: active ? t.accent : "var(--sf-text-2)", border: `1px solid ${active ? t.accent : "var(--sf-line-strong)"}` }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: t.accent }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ ...half, gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 14 }}>
        {numField("Watts", "watts", "W")}
        {numField("Bed W", "bed_w", "mm")}
        {numField("Bed H", "bed_h", "mm")}
      </div>

      <label style={fieldLabel}>
        Lens / module <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional — e.g. 70mm, 150mm, 2W, 10W)</span>
      </label>
      <input value={v.lens} onChange={(e) => setV({ ...v, lens: e.target.value })} placeholder="Working area / effective ranges change per lens" style={{ ...fieldInput, marginBottom: 16 }} />

      {/* Type-aware parameter ranges */}
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "4px 0 10px" }}>
        PARAMETER RANGES · {MACHINE_TYPES[v.type].label}
      </div>
      <RangeEditor type={v.type} ranges={v.ranges} onChange={(next) => setV({ ...v, ranges: next })} />

      {/* Add-ons */}
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "18px 0 10px" }}>ADD-ONS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {ADDONS.map((a) => {
          const on = v.addons.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAddon(a.id)}
              style={{ padding: "7px 11px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 500, background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: on ? "var(--sf-accent)" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      <FormError message={error} />
    </Modal>
  );
}
