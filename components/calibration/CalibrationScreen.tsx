"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { MachineTypeChip } from "@/components/machines/MachineTypeChip";
import { NewRunModal } from "@/components/calibration/NewRunModal";
import { BaselineManager, type BaselineItem } from "@/components/baselines/BaselineManager";
import { deleteRun } from "@/app/(app)/calibration/actions";
import { goalMeta } from "@/lib/calibration/constants";
import type { MachineOption, MaterialOption } from "@/components/recipes/RecipeForm";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface RunListItem {
  id: string;
  name: string;
  materialName: string;
  goal: string;
  machineName: string | null;
  machineType: MachineTypeKey | null;
  testCount: number;
  status: "in-progress" | "promoted";
  dateLabel: string;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

export function CalibrationScreen({ runs, machines, materials, baselines }: { runs: RunListItem[]; machines: MachineOption[]; materials: MaterialOption[]; baselines: BaselineItem[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [managingBaselines, setManagingBaselines] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string, label: string) {
    if (!confirm(`Delete the "${label}" calibration run and all its tests? This can't be undone.`)) return;
    setBusyId(id);
    const res = await deleteRun(id);
    setBusyId(null);
    if (res.ok) router.refresh();
    else alert(res.error);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Calibration Lab</h1>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0 }}>Guided test grids that converge on a calibrated recipe — built from your machine&apos;s real ranges.</p>
        </div>
        <button onClick={() => setManagingBaselines(true)} style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Baselines</button>
        <button onClick={() => setCreating(true)} disabled={machines.length === 0} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: machines.length ? "pointer" : "default", opacity: machines.length ? 1 : 0.5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New calibration
        </button>
      </div>

      {runs.length === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>NO CALIBRATION RUNS YET</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 18px", maxWidth: 440 }}>{machines.length === 0 ? "Add a machine first — calibration grids are built from a machine's parameter ranges." : "Start a guided run: pick a material and goal, grade the test grid, then promote the winning square straight to a recipe."}</p>
          {machines.length > 0 && <button onClick={() => setCreating(true)} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Start your first calibration</button>}
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {runs.map((r) => (
            <div key={r.id} onClick={() => router.push(`/calibration/${r.id}`)} role="button" tabIndex={0} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 18px", borderBottom: "1px solid var(--sf-line)", cursor: "pointer", textAlign: "left", color: "var(--sf-text)", opacity: busyId === r.id ? 0.5 : 1 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></svg>
              </span>
              <div style={{ minWidth: 120, flex: "1 1 220px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.materialName || "Untitled material"}</div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", marginTop: 3 }}>{goalMeta(r.goal).label}</div>
              </div>
              {r.machineType && <MachineTypeChip type={r.machineType} size="sm" />}
              <div className="font-mono sf-tophide" style={{ fontSize: 11.5, color: "var(--sf-text-3)", width: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.machineName}</div>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 70, textAlign: "right" }}>{r.testCount} test{r.testCount === 1 ? "" : "s"}</div>
              <div className="font-mono sf-tophide" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 52, textAlign: "right" }}>{r.dateLabel}</div>
              <div style={{ flex: "none", width: 104, textAlign: "right" }}>
                {r.status === "promoted" ? <Badge tone="success">Promoted</Badge> : <Badge tone="accent">In progress</Badge>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(r.id, r.materialName || "Untitled material"); }}
                disabled={busyId === r.id}
                aria-label="Delete run"
                title="Delete run"
                style={{ flex: "none", width: 30, height: 30, borderRadius: 8, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-text-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && <NewRunModal machines={machines} materials={materials} baselines={baselines} onClose={() => setCreating(false)} />}
      {managingBaselines && <BaselineManager baselines={baselines} onClose={() => setManagingBaselines(false)} />}
    </div>
  );
}
