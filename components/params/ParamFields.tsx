"use client";

import { PARAM_DEFS, TYPE_PARAMS, type MachineTypeKey } from "@/lib/params/schema";
import type { ParamValues } from "@/components/params/ParamReadout";

const numInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  background: "var(--sf-bg)",
  border: "1px solid var(--sf-line-strong)",
  borderRadius: 9,
  color: "var(--sf-text)",
  fontSize: 13.5,
};

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Type-aware value inputs for entering a recipe/attempt's parameters. Iterates
 * the machine type's TYPE_PARAMS so only applicable params appear. When a
 * machine's ranges are known, min/max hint text nudges the user toward valid
 * values (soft guidance; hard clamping is an AI-path concern, BUILD_SPEC §5b).
 */
export function ParamFields({
  type,
  params,
  onChange,
  ranges,
}: {
  type: MachineTypeKey;
  params: ParamValues;
  onChange: (next: ParamValues) => void;
  ranges?: Record<string, { min?: number | null; max?: number | null }>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {TYPE_PARAMS[type].map((key) => {
        const def = PARAM_DEFS[key];
        const r = ranges?.[key];
        const hint =
          r && (r.min != null || r.max != null)
            ? def.kind === "count"
              ? `max ${r.max ?? "—"}`
              : `${r.min ?? "—"}–${r.max ?? "—"}`
            : def.unit || "";
        return (
          <div key={key}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 5px" }}>
              {def.label}
              {hint && <span className="font-mono" style={{ fontSize: 9.5, color: "var(--sf-text-3)", marginLeft: 6, fontWeight: 500 }}>{hint}</span>}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={def.decimals > 0 ? "0.001" : "1"}
              value={params[key] ?? ""}
              onChange={(e) => onChange({ ...params, [key]: toNum(e.target.value) })}
              style={numInput}
            />
          </div>
        );
      })}
    </div>
  );
}
