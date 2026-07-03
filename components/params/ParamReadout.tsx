import { PARAM_DEFS, TYPE_PARAMS, formatParam, type MachineTypeKey } from "@/lib/params/schema";

export type ParamValues = Record<string, number | null | undefined>;

/**
 * Read-only parameter readout for detail views — one labeled value tile per
 * param the machine type exposes (type-aware). Missing values render as "—".
 */
export function ParamReadout({ type, params, columns = 3 }: { type: MachineTypeKey; params: ParamValues; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {TYPE_PARAMS[type].map((key) => {
        const def = PARAM_DEFS[key];
        const v = params[key];
        const shown = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? "—" : formatParam(key, v as number);
        return (
          <div key={key} style={{ background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 10, padding: "12px 13px" }}>
            <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".12em", color: "var(--sf-text-3)" }}>{def.short}</div>
            <div className="font-display" style={{ fontSize: 19, fontWeight: 600, marginTop: 5 }}>{shown}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact single-line param summary (mono) for list rows. */
export function paramSummary(type: MachineTypeKey, params: ParamValues): string {
  return TYPE_PARAMS[type]
    .map((key) => {
      const v = params[key];
      if (v === null || v === undefined) return null;
      const def = PARAM_DEFS[key];
      return `${def.short} ${formatParam(key, v as number)}`;
    })
    .filter(Boolean)
    .join("  ·  ");
}
