"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MachineTypeChip } from "@/components/machines/MachineTypeChip";
import { MachineForm, type MachineFormValue } from "@/components/machines/MachineForm";
import { deleteMachine } from "@/app/(app)/machines/actions";
import { PARAM_DEFS, TYPE_PARAMS, ADDONS, MACHINE_TYPES } from "@/lib/params/schema";

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

function rangeText(r: { min?: number | null; max?: number | null } | undefined, isCount: boolean): string {
  if (!r) return "—";
  if (isCount) return r.max != null ? `max ${r.max}` : "—";
  if (r.min == null && r.max == null) return "—";
  return `${r.min ?? "—"} – ${r.max ?? "—"}`;
}

export function MachineDetail({ machine, recipeCount }: { machine: MachineFormValue; recipeCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const addonLabels = ADDONS.filter((a) => machine.addons.includes(a.id));

  async function onDelete() {
    if (!machine.id) return;
    if (!confirm(`Delete “${machine.name}”? Recipes and attempts keep their data but lose the machine link.`)) return;
    setBusy(true);
    const res = await deleteMachine(machine.id);
    if (res.ok) router.push("/machines");
    else setBusy(false);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/machines" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--sf-text-2)", textDecoration: "none", marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 6l-6 6 6 6" /></svg>
        Machines
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{machine.name}</h1>
            <MachineTypeChip type={machine.type} />
          </div>
          <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "7px 0 0" }}>
            {[machine.manufacturer, machine.model].filter(Boolean).join(" ") || "No manufacturer/model set"}
            {machine.lens ? ` · ${machine.lens}` : ""} · {machine.watts}W · {machine.bed_w}×{machine.bed_h}mm · {recipeCount} recipe{recipeCount === 1 ? "" : "s"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button onClick={() => setEditing(true)} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
          <button onClick={onDelete} disabled={busy} style={{ height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-danger)", background: "var(--sf-danger-soft)", color: "var(--sf-danger)", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>Delete</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="sf-grid2">
        {/* Parameter ranges — rendered from the type schema */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 14 }}>
            PARAMETER RANGES · {MACHINE_TYPES[machine.type].label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TYPE_PARAMS[machine.type].map((key, i) => {
              const def = PARAM_DEFS[key];
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--sf-line)" }}>
                  <span className="font-mono" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "var(--sf-text-3)", width: 58, flex: "none" }}>{def.short}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{def.label}</span>
                  <span className="font-mono" style={{ fontSize: 13, color: "var(--sf-text)" }}>{rangeText(machine.ranges[key], def.kind === "count")}</span>
                  {def.unit && <span className="font-mono" style={{ fontSize: 10.5, color: "var(--sf-text-3)", width: 42, textAlign: "right" }}>{def.unit}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right rail: add-ons + calibrate entry */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>ADD-ONS</div>
            {addonLabels.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No add-ons on this machine.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {addonLabels.map((a) => (
                  <span key={a.id} style={{ padding: "6px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 500, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", color: "var(--sf-text-2)" }}>{a.label}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...card, padding: "18px 20px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 8 }}>CALIBRATION</div>
            <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: "0 0 14px" }}>Dial in a new material on this machine — grids are built from its real ranges above.</p>
            <Link href="/calibration" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 15px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /></svg>
              Calibrate
            </Link>
          </div>
        </div>
      </div>

      {editing && <MachineForm initial={machine} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </div>
  );
}
