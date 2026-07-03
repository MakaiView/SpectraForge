"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, fieldInput, fieldLabel, FormError } from "@/components/ui/Modal";
import { MachineTypeChip } from "@/components/machines/MachineTypeChip";
import { MACHINE_TYPES, PARAM_DEFS, formatParam, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import { importBaselines, deleteBaseline } from "@/app/(app)/calibration/baselines-actions";

export interface BaselineItem {
  id: string;
  machineType: MachineTypeKey;
  lens: string;
  materialName: string;
  process: string;
  params: Record<string, number>;
  source: string;
}

const TYPE_KEYS = Object.keys(MACHINE_TYPES) as MachineTypeKey[];

function paramsText(type: MachineTypeKey, params: Record<string, number>): string {
  return Object.keys(params)
    .filter((k) => k in PARAM_DEFS)
    .map((k) => `${PARAM_DEFS[k as ParamKey].short} ${formatParam(k as ParamKey, params[k])}`)
    .join(" · ");
}

export function BaselineManager({ baselines, onClose }: { baselines: BaselineItem[]; onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<MachineTypeKey>("diode");
  const [lens, setLens] = useState("");
  const [source, setSource] = useState("manufacturer");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function doImport() {
    setBusy(true); setError(""); setMsg("");
    const res = await importBaselines({ machine_id: null, machine_type: type, lens, source, text });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMsg(`Imported ${res.data!.imported} baseline${res.data!.imported === 1 ? "" : "s"}${res.data!.skipped ? ` (${res.data!.skipped} skipped)` : ""}.`);
    setText("");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await deleteBaseline(id);
    if (res.ok) router.refresh();
  }

  return (
    <Modal onClose={onClose} title="Manufacturer baselines" maxWidth={640}>
      <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: "0 0 16px" }}>
        Owner-provided starting settings that center calibration grids and ground AI suggestions. Import from your manufacturer tables — one baseline per line.
      </p>

      {/* Importer */}
      <div style={{ background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={fieldLabel}>Machine type</label>
            <select value={type} onChange={(e) => setType(e.target.value as MachineTypeKey)} style={{ ...fieldInput, appearance: "auto" }}>
              {TYPE_KEYS.map((k) => (<option key={k} value={k}>{MACHINE_TYPES[k].label}</option>))}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Lens / module</label>
            <input value={lens} onChange={(e) => setLens(e.target.value)} placeholder="70mm, 10W…" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} style={fieldInput} />
          </div>
        </div>
        <label style={fieldLabel}>Rows <span style={{ color: "var(--sf-text-3)", fontWeight: 400, fontFamily: "var(--font-jetbrains)", fontSize: 11 }}>material | process | key=val, key=val</span></label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Acrylic 3mm | cut | power=100, speed=8, passes=2\nBasswood | engrave | power=40, speed=180, dpi=254"} style={{ ...fieldInput, minHeight: 96, fontFamily: "var(--font-jetbrains)", fontSize: 12.5, resize: "vertical" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button onClick={doImport} disabled={busy} style={{ height: 36, padding: "0 15px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>{busy ? "Importing…" : "Import"}</button>
          {msg && <span style={{ fontSize: 12.5, color: "var(--sf-success)" }}>{msg}</span>}
        </div>
        <FormError message={error} />
      </div>

      {/* List */}
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 10 }}>BASELINES · {baselines.length}</div>
      {baselines.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No baselines yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
          {baselines.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--sf-line)" }}>
              <MachineTypeChip type={b.machineType} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.materialName} <span style={{ color: "var(--sf-text-3)", fontWeight: 400, textTransform: "capitalize" }}>· {b.process}{b.lens ? ` · ${b.lens}` : ""}</span></div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{paramsText(b.machineType, b.params)}</div>
              </div>
              <button onClick={() => remove(b.id)} aria-label="Delete" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-danger)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
