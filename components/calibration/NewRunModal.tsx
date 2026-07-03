"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, fieldInput, fieldLabel, FormError, ModalButtons } from "@/components/ui/Modal";
import { useActiveMachine } from "@/components/shell/ActiveMachineProvider";
import { GOALS, type GoalKey } from "@/lib/calibration/constants";
import { PARAM_DEFS, formatParam, type ParamKey } from "@/lib/params/schema";
import { createRun, suggestSettings } from "@/app/(app)/calibration/actions";
import type { MachineOption, MaterialOption } from "@/components/recipes/RecipeForm";
import type { BaselineItem } from "@/components/baselines/BaselineManager";

const SOURCE_LABEL: Record<string, string> = { ai: "AI suggestion", baseline: "manufacturer baseline", heuristic: "mid-range default" };

export function NewRunModal({ machines, materials, baselines, onClose }: { machines: MachineOption[]; materials: MaterialOption[]; baselines: BaselineItem[]; onClose: () => void }) {
  const router = useRouter();
  const { active } = useActiveMachine();
  const [materialId, setMaterialId] = useState<string>("");
  const [machineId, setMachineId] = useState<string>(active?.id ?? machines[0]?.id ?? "");
  const [goal, setGoal] = useState<GoalKey>("cut");
  const [baseline, setBaseline] = useState<{ params: Record<string, number>; rationale: string; source: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const machine = machines.find((m) => m.id === machineId) || null;
  const materialName = materials.find((m) => m.id === materialId)?.name ?? "";

  // Baselines applicable to the chosen machine type.
  const matchingBaselines = useMemo(() => (machine ? baselines.filter((b) => b.machineType === machine.type) : []), [baselines, machine]);

  async function suggest() {
    if (!machineId) return setError("Pick a machine first.");
    setSuggesting(true); setError("");
    const res = await suggestSettings({ machineId, materialName, goal });
    setSuggesting(false);
    if (!res.ok) return setError(res.error);
    setBaseline({ params: res.data!.params, rationale: res.data!.rationale, source: res.data!.source });
  }

  function pickBaseline(id: string) {
    const b = matchingBaselines.find((x) => x.id === id);
    setBaseline(b ? { params: b.params, rationale: `${b.materialName} · ${b.process}${b.lens ? ` · ${b.lens}` : ""}`, source: "baseline" } : null);
  }

  async function create() {
    if (!machineId) return setError("Pick a machine to calibrate.");
    setSaving(true); setError("");
    const res = await createRun({ materialId: materialId || null, materialName, machineId, goal, baseline: baseline?.params ?? null });
    if (!res.ok) { setSaving(false); return setError(res.error); }
    router.push(`/calibration/${res.data!.runId}`);
  }

  return (
    <Modal onClose={onClose} title="New calibration" maxWidth={560} footer={<ModalButtons onCancel={onClose} onSave={create} saving={saving} saveLabel="Start calibration" />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={fieldLabel}>Material</label>
          <select value={materialId} onChange={(e) => { setMaterialId(e.target.value); setBaseline(null); }} style={{ ...fieldInput, appearance: "auto" }}>
            <option value="">— None —</option>
            {materials.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Machine</label>
          <select value={machineId} onChange={(e) => { setMachineId(e.target.value); setBaseline(null); }} style={{ ...fieldInput, appearance: "auto" }}>
            {machines.length === 0 && <option value="">— No machines —</option>}
            {machines.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
      </div>

      <label style={fieldLabel}>Goal</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {GOALS.map((g) => {
          const on = goal === g.key;
          return (
            <button key={g.key} type="button" onClick={() => { setGoal(g.key); setBaseline(null); }} style={{ textAlign: "left", padding: "11px 13px", borderRadius: 10, cursor: "pointer", background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: on ? "var(--sf-accent)" : "var(--sf-text)" }}>{g.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--sf-text-3)", marginTop: 2 }}>{g.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Starting point: suggest (AI/baseline/mid-range) or pick a baseline */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--sf-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={suggest} disabled={suggesting} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-accent)", background: "var(--sf-accent-soft)", color: "var(--sf-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
            {suggesting ? "Thinking…" : "Suggest starting point"}
          </button>
          {matchingBaselines.length > 0 && (
            <select onChange={(e) => pickBaseline(e.target.value)} defaultValue="" style={{ ...fieldInput, appearance: "auto", flex: 1, minWidth: 160, height: 36, padding: "0 12px" }}>
              <option value="">Or pick a baseline…</option>
              {matchingBaselines.map((b) => (<option key={b.id} value={b.id}>{b.materialName} · {b.process}{b.lens ? ` · ${b.lens}` : ""}</option>))}
            </select>
          )}
        </div>

        {baseline && (
          <div style={{ marginTop: 12, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 10, padding: "11px 13px" }}>
            <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--sf-accent)", marginBottom: 7 }}>STARTING POINT · {(SOURCE_LABEL[baseline.source] ?? baseline.source).toUpperCase()}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {Object.keys(baseline.params).filter((k) => k in PARAM_DEFS).map((k) => (
                <span key={k} className="font-mono" style={{ fontSize: 11.5, background: "var(--sf-bg)", border: "1px solid var(--sf-line)", borderRadius: 7, padding: "4px 9px" }}>{PARAM_DEFS[k as ParamKey].short} {formatParam(k as ParamKey, baseline.params[k])}</span>
              ))}
            </div>
            {baseline.rationale && <p style={{ fontSize: 12, color: "var(--sf-text-3)", margin: "8px 0 0" }}>{baseline.rationale}</p>}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--sf-text-3)", margin: "14px 0 0" }}>The first test grid is built from this machine&apos;s real ranges — centered on the starting point when set.</p>

      <FormError message={error} />
    </Modal>
  );
}
