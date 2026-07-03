"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { paramSummary, type ParamValues } from "@/components/params/ParamReadout";
import { AttemptView, OUTCOME_META } from "@/components/attempts/AttemptView";
import { AttemptForm, blankAttempt, type AttemptFormValue } from "@/components/attempts/AttemptForm";
import { useActiveMachine } from "@/components/shell/ActiveMachineProvider";
import type { MachineOption, MaterialOption } from "@/components/recipes/RecipeForm";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface AttemptItem {
  id: string;
  dateLabel: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  machineName: string | null;
  machineType: MachineTypeKey | null;
  outcome: string;
  params: ParamValues;
  addons: string[];
  note: string;
  inputThumbUrl: string | null;
  inputFullUrl: string | null;
  resultThumbUrl: string | null;
  resultFullUrl: string | null;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

function Thumb({ url }: { url: string | null }) {
  return (
    <span style={{ width: 44, height: 34, borderRadius: 7, overflow: "hidden", background: "var(--sf-bg)", border: "1px solid var(--sf-line)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" /></svg>}
    </span>
  );
}

export function AttemptsScreen({ attempts, machines, materials }: { attempts: AttemptItem[]; machines: MachineOption[]; materials: MaterialOption[] }) {
  const router = useRouter();
  const { active } = useActiveMachine();
  const [viewing, setViewing] = useState<AttemptItem | null>(null);
  const [form, setForm] = useState<{ value: AttemptFormValue; inputUrl: string | null; resultUrl: string | null } | null>(null);

  function openNew() {
    setForm({ value: blankAttempt(active?.id ?? machines[0]?.id ?? null), inputUrl: null, resultUrl: null });
  }
  function openEdit(a: AttemptItem) {
    setViewing(null);
    setForm({
      value: { id: a.id, material_id: a.material_id, material_name: a.material_name, process: a.process, machine_id: a.machine_id, outcome: (a.outcome as AttemptFormValue["outcome"]) || "clean", params: a.params, addons: a.addons, note: a.note },
      inputUrl: a.inputFullUrl,
      resultUrl: a.resultFullUrl,
    });
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Attempts</h1>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0 }}>{attempts.length} logged · outcomes, photos, and the settings behind each one.</p>
        </div>
        <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Log attempt
        </button>
      </div>

      {attempts.length === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>NO ATTEMPTS YET</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 18px", maxWidth: 440 }}>Log a real burn — its settings, outcome, and input/result photos. Attempts build the history that refines your recipes.</p>
          <button onClick={openNew} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Log your first attempt</button>
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {attempts.map((a) => {
            const om = OUTCOME_META[a.outcome] ?? OUTCOME_META.clean;
            const summary = a.machineType ? paramSummary(a.machineType, a.params) : "";
            return (
              <div key={a.id} onClick={() => setViewing(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--sf-line)", cursor: "pointer" }}>
                <span className="font-mono sf-tophide" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 54, flex: "none" }}>{a.dateLabel}</span>
                <span style={{ display: "flex", gap: 5, flex: "none" }}><Thumb url={a.inputThumbUrl} /><Thumb url={a.resultThumbUrl} /></span>
                <div style={{ minWidth: 110, flex: "1 1 180px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.material_name || "Untitled"}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[a.process, a.machineName].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="font-mono sf-tophide" style={{ fontSize: 12, color: "var(--sf-text-2)", flex: "0 1 240px", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</div>
                <div className="sf-tophide" style={{ flex: "1 1 auto", fontSize: 12.5, color: "var(--sf-text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{a.note}</div>
                <div style={{ flex: "none", width: 92, textAlign: "right" }}><Badge tone={om.tone}>{om.label}</Badge></div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
              </div>
            );
          })}
        </div>
      )}

      {viewing && <AttemptView attempt={viewing} onClose={() => setViewing(null)} onEdit={() => openEdit(viewing)} />}
      {form && (
        <AttemptForm
          initial={form.value}
          machines={machines}
          materials={materials}
          existingInputUrl={form.inputUrl}
          existingResultUrl={form.resultUrl}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
