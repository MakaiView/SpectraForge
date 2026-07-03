"use client";

import { useState } from "react";
import { Modal, fieldInput, fieldLabel, FormError, ModalButtons } from "@/components/ui/Modal";
import { ParamFields } from "@/components/params/ParamFields";
import { PhotoZone } from "@/components/attempts/PhotoZone";
import type { ParamValues } from "@/components/params/ParamReadout";
import type { MachineOption, MaterialOption } from "@/components/recipes/RecipeForm";
import { ADDONS } from "@/lib/params/schema";
import { saveAttempt, type AttemptInput } from "@/app/(app)/attempts/actions";

export interface AttemptFormValue {
  id?: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  outcome: "clean" | "marginal" | "fail";
  params: ParamValues;
  addons: string[];
  note: string;
}

export function blankAttempt(defaultMachineId: string | null): AttemptFormValue {
  return { material_id: null, material_name: "", process: "cut", machine_id: defaultMachineId, outcome: "clean", params: {}, addons: [], note: "" };
}

const PROCESSES: ("cut" | "engrave" | "mark")[] = ["cut", "engrave", "mark"];
const OUTCOMES: { key: "clean" | "marginal" | "fail"; label: string; tone: string }[] = [
  { key: "clean", label: "Clean", tone: "var(--sf-success)" },
  { key: "marginal", label: "Marginal", tone: "var(--sf-warn)" },
  { key: "fail", label: "Fail", tone: "var(--sf-danger)" },
];
const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const textarea: React.CSSProperties = { ...fieldInput, minHeight: 60, resize: "vertical", fontFamily: "inherit" };

async function uploadPhoto(attemptId: string, kind: "input" | "result", file: File) {
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file);
  return fetch(`/api/attempts/${attemptId}/photo`, { method: "POST", body: fd });
}
async function removePhoto(attemptId: string, kind: "input" | "result") {
  return fetch(`/api/attempts/${attemptId}/photo?kind=${kind}`, { method: "DELETE" });
}

export function AttemptForm({
  initial,
  machines,
  materials,
  existingInputUrl,
  existingResultUrl,
  onClose,
  onSaved,
}: {
  initial: AttemptFormValue;
  machines: MachineOption[];
  materials: MaterialOption[];
  existingInputUrl?: string | null;
  existingResultUrl?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<AttemptFormValue>(initial);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [inputCleared, setInputCleared] = useState(false);
  const [resultCleared, setResultCleared] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const machine = machines.find((m) => m.id === v.machine_id) || null;
  const machineAddons = machine ? ADDONS.filter((a) => machine.addons.includes(a.id)) : [];

  function pickMaterial(id: string) {
    const mat = materials.find((m) => m.id === id);
    setV({ ...v, material_id: id || null, material_name: mat?.name ?? "" });
  }
  function toggleAddon(id: string) {
    setV((s) => ({ ...s, addons: s.addons.includes(id) ? s.addons.filter((a) => a !== id) : [...s.addons, id] }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload: AttemptInput = { ...v };
    const res = await saveAttempt(payload);
    if (!res.ok) {
      setSaving(false);
      return setError(res.error);
    }

    // Attach / replace / remove photos after the row exists.
    try {
      if (inputFile) await uploadPhoto(res.id, "input", inputFile);
      else if (inputCleared && existingInputUrl) await removePhoto(res.id, "input");
      if (resultFile) await uploadPhoto(res.id, "result", resultFile);
      else if (resultCleared && existingResultUrl) await removePhoto(res.id, "result");
    } catch {
      setSaving(false);
      return setError("The attempt saved, but a photo failed to upload.");
    }

    onSaved();
  }

  return (
    <Modal onClose={onClose} title={v.id ? "Edit attempt" : "Log an attempt"} maxWidth={600} footer={<ModalButtons onCancel={onClose} onSave={save} saving={saving} saveLabel={v.id ? "Save changes" : "Log attempt"} />}>
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
          <select value={v.machine_id ?? ""} onChange={(e) => setV({ ...v, machine_id: e.target.value || null, addons: [] })} style={{ ...fieldInput, appearance: "auto" }}>
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
              return <button key={p} type="button" onClick={() => setV({ ...v, process: p })} style={{ flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", textTransform: "capitalize", fontSize: 12.5, fontWeight: 600, background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: on ? "var(--sf-accent)" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>{p}</button>;
            })}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Outcome</label>
          <div style={{ display: "flex", gap: 6 }}>
            {OUTCOMES.map((o) => {
              const on = v.outcome === o.key;
              return <button key={o.key} type="button" onClick={() => setV({ ...v, outcome: o.key })} style={{ flex: 1, padding: "9px 0", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: on ? `${o.tone}22` : "var(--sf-bg)", color: on ? o.tone : "var(--sf-text-2)", border: `1px solid ${on ? o.tone : "var(--sf-line-strong)"}` }}>{o.label}</button>;
            })}
          </div>
        </div>
      </div>

      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "6px 0 10px" }}>PARAMETERS</div>
      {machine ? (
        <ParamFields type={machine.type} params={v.params} ranges={machine.ranges} onChange={(next) => setV({ ...v, params: next })} />
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--sf-text-3)", margin: "0 0 6px" }}>Select a machine to enter its type-specific parameters.</p>
      )}

      {machineAddons.length > 0 && (
        <>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "16px 0 10px" }}>ACCESSORIES USED</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {machineAddons.map((a) => {
              const on = v.addons.includes(a.id);
              return <button key={a.id} type="button" onClick={() => toggleAddon(a.id)} style={{ padding: "7px 11px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 500, background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: on ? "var(--sf-accent)" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>{a.label}</button>;
            })}
          </div>
        </>
      )}

      {/* Photo zones */}
      <div style={{ ...half, margin: "16px 0 12px" }}>
        <PhotoZone label="INPUT PHOTO" file={inputFile} existingUrl={inputCleared ? null : existingInputUrl ?? null} onPick={(f) => { setInputFile(f); setInputCleared(false); }} onClear={() => { setInputFile(null); setInputCleared(true); }} />
        <PhotoZone label="RESULT PHOTO" file={resultFile} existingUrl={resultCleared ? null : existingResultUrl ?? null} onPick={(f) => { setResultFile(f); setResultCleared(false); }} onClear={() => { setResultFile(null); setResultCleared(true); }} />
      </div>

      <label style={fieldLabel}>Note <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
      <textarea value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="What happened — edge quality, char, depth…" style={textarea} />

      <FormError message={error} />
    </Modal>
  );
}
