"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MachineTypeChip } from "@/components/machines/MachineTypeChip";
import { MachineForm, blankMachine, type MachineFormValue } from "@/components/machines/MachineForm";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface MachineListItem {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  type: MachineTypeKey;
  watts: number;
  bed_w: number;
  bed_h: number;
  lens: string;
  addons: string[];
  ranges: Record<string, { min?: number | null; max?: number | null }>;
  recipeCount: number;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

export function MachinesScreen({ machines }: { machines: MachineListItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<MachineFormValue | null>(null);

  function openNew() {
    setForm(blankMachine());
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Machines</h1>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: 0 }}>
            {machines.length} machine{machines.length === 1 ? "" : "s"} · their add-ons and the ranges that constrain every recipe and calibration run.
          </p>
        </div>
        <button onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New machine
        </button>
      </div>

      {machines.length === 0 ? (
        <div style={{ ...card, padding: "48px 28px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>NO MACHINES YET</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "10px auto 18px", maxWidth: 420 }}>
            Everything keys off your laser. Add your first machine — its type, wattage, bed size and setting ranges tailor every recipe and calibration grid.
          </p>
          <button onClick={openNew} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Add your first machine</button>
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/machines/${m.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 18px", borderBottom: "1px solid var(--sf-line)", background: "transparent", border: "none", borderBottomStyle: "solid", cursor: "pointer", textAlign: "left", color: "var(--sf-text)" }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--sf-surface-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="8" rx="1.5" /><path d="M7 12v3M17 12v3M5 18h14" /><circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" /></svg>
              </span>
              <div style={{ minWidth: 120, flex: "1 1 200px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                  <MachineTypeChip type={m.type} size="sm" />
                </div>
                <div style={{ fontSize: 12, color: "var(--sf-text-3)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[m.manufacturer, m.model].filter(Boolean).join(" ")}
                  {m.lens ? ` · ${m.lens}` : ""}
                </div>
              </div>
              <div className="font-mono sf-tophide" style={{ fontSize: 11.5, color: "var(--sf-text-3)", flex: "0 1 200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.watts}W · {m.bed_w}×{m.bed_h}mm
              </div>
              <div className="font-mono sf-tophide" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 90, textAlign: "right" }}>{m.addons.length} add-on{m.addons.length === 1 ? "" : "s"}</div>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--sf-text-3)", width: 78, textAlign: "right" }}>{m.recipeCount} recipe{m.recipeCount === 1 ? "" : "s"}</div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.8" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
            </button>
          ))}
        </div>
      )}

      {form && <MachineForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); router.refresh(); }} />}
    </div>
  );
}
