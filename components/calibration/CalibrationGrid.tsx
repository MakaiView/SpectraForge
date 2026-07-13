"use client";

import { PARAM_DEFS } from "@/lib/params/schema";
import { formatParam } from "@/lib/params/schema";
import type { TestAxes, Grid, BestSquare } from "@/lib/calibration/engine";
import { gradeMeta } from "@/lib/calibration/grades";

/**
 * The test grid. Rows = y-axis (primary/energy, high→low top-to-bottom),
 * columns = x-axis (sweep). Click a cell to cycle its grade; the ★ marks the
 * recommended square. Read-only when `editable` is false (past tests).
 */
export function CalibrationGrid({
  axes,
  grid,
  best,
  editable,
  onCellClick,
}: {
  axes: TestAxes;
  grid: Grid;
  best: BestSquare | null;
  editable: boolean;
  onCellClick?: (row: number, col: number) => void;
}) {
  const rows = axes.y.values.length;
  const cols = axes.x.values.length;
  const yDef = PARAM_DEFS[axes.y.key];
  const xDef = PARAM_DEFS[axes.x.key];

  return (
    <div>
      {/* x-axis label */}
      <div className="font-mono" style={{ textAlign: "center", fontSize: 10, letterSpacing: ".12em", color: "var(--sf-text-3)", marginBottom: 8 }}>
        {xDef.label.toUpperCase()} →
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {/* y-axis label (rotated) */}
        <div className="font-mono" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10, letterSpacing: ".12em", color: "var(--sf-text-3)", textAlign: "center", paddingTop: 22 }}>
          {yDef.label.toUpperCase()} →
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
          {/* column headers */}
          <div style={{ display: "grid", gridTemplateColumns: `44px repeat(${cols}, minmax(52px, 1fr))`, gap: 6, marginBottom: 6 }}>
            <div />
            {axes.x.values.map((v, c) => (
              <div key={c} className="font-mono" style={{ fontSize: 11, textAlign: "center", color: "var(--sf-text-2)" }}>{v}</div>
            ))}
          </div>

          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} style={{ display: "grid", gridTemplateColumns: `44px repeat(${cols}, minmax(52px, 1fr))`, gap: 6, marginBottom: 6 }}>
              <div className="font-mono" style={{ fontSize: 11, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "var(--sf-text-2)", paddingRight: 4 }}>{axes.y.values[r]}</div>
              {Array.from({ length: cols }).map((_, c) => {
                const st = gradeMeta(grid[`${r},${c}`] ?? "ungraded");
                const isBest = best && best.row === r && best.col === c;
                return (
                  <button
                    key={c}
                    onClick={editable ? () => onCellClick?.(r, c) : undefined}
                    style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 8, background: st.bg, border: `1.5px solid ${isBest ? "var(--sf-accent)" : st.border}`, boxShadow: isBest ? "0 0 0 2px var(--sf-accent-soft)" : "none", cursor: editable ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    title={`${yDef.short} ${axes.y.values[r]} · ${xDef.short} ${axes.x.values[c]}`}
                  >
                    {isBest && <span style={{ position: "absolute", top: 2, right: 3, fontSize: 12, color: "var(--sf-accent)" }}>★</span>}
                    <span style={{ fontSize: 13, fontWeight: 700, color: st.color }}>{st.symbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {best && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--sf-text-2)" }}>
          <span style={{ color: "var(--sf-accent)" }}>★</span> Recommended: <span className="font-mono">{yDef.short} {formatParam(axes.y.key, best.params[axes.y.key])} · {xDef.short} {formatParam(axes.x.key, best.params[axes.x.key])}</span>
        </div>
      )}
    </div>
  );
}
