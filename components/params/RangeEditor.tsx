"use client";

import { PARAM_DEFS, TYPE_PARAMS, type MachineTypeKey } from "@/lib/params/schema";

export type Ranges = Record<string, { min?: number | null; max?: number | null }>;

const numInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  background: "var(--sf-bg)",
  border: "1px solid var(--sf-line-strong)",
  borderRadius: 8,
  color: "var(--sf-text)",
  fontSize: 13,
};

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Per-parameter min/max editor for a machine's capability ranges. Iterates the
 * machine type's TYPE_PARAMS — a param the type doesn't expose never appears
 * (BUILD_SPEC §8). `passes` (kind: count) shows a single max.
 */
export function RangeEditor({ type, ranges, onChange }: { type: MachineTypeKey; ranges: Ranges; onChange: (next: Ranges) => void }) {
  function set(key: string, edge: "min" | "max", v: string) {
    onChange({ ...ranges, [key]: { ...ranges[key], [edge]: toNum(v) } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {TYPE_PARAMS[type].map((key) => {
        const def = PARAM_DEFS[key];
        const r = ranges[key] ?? {};
        const isCount = def.kind === "count";
        return (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {def.label}
              {def.unit && <span className="font-mono" style={{ fontSize: 10, color: "var(--sf-text-3)", marginLeft: 5 }}>{def.unit}</span>}
            </div>
            {isCount ? (
              <div style={{ gridColumn: "2 / 4" }}>
                <input type="number" inputMode="numeric" placeholder="max passes" value={r.max ?? ""} onChange={(e) => set(key, "max", e.target.value)} style={numInput} />
              </div>
            ) : (
              <>
                <input type="number" placeholder="min" value={r.min ?? ""} onChange={(e) => set(key, "min", e.target.value)} style={numInput} />
                <input type="number" placeholder="max" value={r.max ?? ""} onChange={(e) => set(key, "max", e.target.value)} style={numInput} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
