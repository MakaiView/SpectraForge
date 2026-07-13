"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalibrationGrid } from "@/components/calibration/CalibrationGrid";
import { PromoteModal } from "@/components/calibration/PromoteModal";
import { MachineTypeChip } from "@/components/machines/MachineTypeChip";
import { applicablePatterns, goalMeta, patternLabel, type PatternKey } from "@/lib/calibration/constants";
import { axisIsRound, lightburnMap, edgeExtensions, resolveCell, type TestAxes, type Grid, type Grade, type BestSquare } from "@/lib/calibration/engine";
import { formatParam, PARAM_DEFS, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import { updateTestConfig, saveGrid, saveRationale, gradeSheet, refineRun } from "@/app/(app)/calibration/actions";

export interface WizardRun {
  id: string;
  materialName: string;
  goal: string;
  context: string;
  machineId: string | null;
  machineName: string | null;
  machineType: MachineTypeKey | null;
  machineRanges: Record<string, { min?: number | null; max?: number | null }>;
  status: "in-progress" | "promoted";
  promotedRecipeId: string | null;
}
export interface WizardTest {
  id: string;
  idx: number;
  pattern: string;
  axes: TestAxes;
  statics: Record<string, number>;
  grid: Grid;
  best: BestSquare | null;
  aiGrid: Grid | null;
  aiBest: BestSquare | null;
  rationale: string;
  analysis: { headline: string; writeup: string } | null;
  sheetThumbUrl: string | null;
  sheetFullUrl: string | null;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };
const CYCLE: Grade[] = ["ungraded", "great", "possible", "bad", "fail"];

export function RunWizard({ run, tests }: { run: WizardRun; tests: WizardTest[] }) {
  const router = useRouter();
  const promoted = run.status === "promoted";
  const currentTest = tests[tests.length - 1] ?? null;
  const N = tests.length;

  // Stepper nodes: 0 = Setup, 1..N = tests, N+1 = Promote. Default to current test.
  const [sel, setSel] = useState<number>(N);
  const [grid, setGridState] = useState<Grid>(currentTest?.grid ?? {});
  const [best, setBest] = useState<BestSquare | null>(currentTest?.best ?? null);
  const [mode, setMode] = useState<"grade" | "winner">("grade");
  const [rationale, setRationale] = useState<string>(currentTest?.rationale ?? "");
  const [busy, setBusy] = useState<string>("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rationaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const axesKey = JSON.stringify(currentTest?.axes ?? {});
  useEffect(() => {
    setGridState(currentTest?.grid ?? {});
    setBest(currentTest?.best ?? null);
    setRationale(currentTest?.rationale ?? "");
    setMode("grade");
  }, [currentTest?.id, currentTest?.pattern, currentTest?.analysis, axesKey]);

  const patterns = run.machineType ? applicablePatterns(run.machineType) : [];
  const viewingTest: WizardTest | null = sel >= 1 && sel <= N ? tests[sel - 1] : null;
  const isCurrent = viewingTest && currentTest && viewingTest.id === currentTest.id;
  const editable = !!isCurrent && !promoted;

  // Cells the human has actually graded — gates revealing the AI's take.
  const gradedCount = useMemo(() => Object.values(grid).filter((g) => g && g !== "ungraded").length, [grid]);

  function onCellClick(row: number, col: number) {
    if (!currentTest) return;
    if (mode === "winner") {
      // Designate this cell as the human's best square.
      const nextBest: BestSquare = { row, col, params: resolveCell(currentTest.axes, currentTest.statics, row, col) };
      setBest(nextBest);
      saveGrid(currentTest.id, grid, nextBest); // fire-and-forget
      return;
    }
    const key = `${row},${col}`;
    const cur = (grid[key] ?? "ungraded") as Grade;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    const nextGrid = { ...grid, [key]: next };
    setGridState(nextGrid);
    saveGrid(currentTest.id, nextGrid, best); // fire-and-forget
  }

  function onRationale(text: string) {
    setRationale(text);
    if (!currentTest) return;
    if (rationaleTimer.current) clearTimeout(rationaleTimer.current);
    const id = currentTest.id;
    rationaleTimer.current = setTimeout(() => saveRationale(id, text), 600);
  }

  // Reveal the AI's independent grade (writes ai_grid; never your grid).
  async function onRevealAi() {
    if (!currentTest) return;
    setBusy("grade");
    try {
      await gradeSheet(currentTest.id);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  // How often your grade and the AI's agree, across cells both of you graded.
  const agreement = useMemo(() => {
    const ai = viewingTest?.aiGrid;
    if (!ai) return null;
    const human = editable ? grid : viewingTest?.grid ?? {};
    let both = 0, match = 0;
    for (const k of Object.keys(ai)) {
      const a = ai[k], h = human[k];
      if (a && a !== "ungraded" && h && h !== "ungraded") { both++; if (a === h) match++; }
    }
    return both ? { pct: Math.round((match / both) * 100), both, match } : null;
  }, [viewingTest?.aiGrid, viewingTest?.grid, grid, editable]);

  async function onPattern(pattern: PatternKey) {
    if (!currentTest) return;
    setBusy("config");
    await updateTestConfig(currentTest.id, pattern, currentTest.axes.x.values.length);
    setBusy("");
    router.refresh();
  }

  async function onRefine() {
    setBusy("refine");
    const res = await refineRun(run.id);
    setBusy("");
    if (res.ok) { router.refresh(); setSel(N + 1 > N ? N + 1 : N); setTimeout(() => setSel(N + 1), 0); }
  }

  async function onUploadSheet(file: File) {
    if (!currentTest) return;
    setBusy("upload");
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/calibration/tests/${currentTest.id}/photo`, { method: "POST", body: fd });
    setBusy("");
    router.refresh();
  }

  // ── Stepper header ──
  const nodes = [{ label: "Setup", idx: 0 }, ...tests.map((t) => ({ label: `Test ${t.idx}`, idx: t.idx })), { label: "Promote", idx: N + 1 }];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/calibration" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--sf-text-2)", textDecoration: "none", marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M15 6l-6 6 6 6" /></svg>
        Calibration Lab
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{run.materialName || "Untitled"} · {goalMeta(run.goal).label}</h1>
        {run.machineType && <MachineTypeChip type={run.machineType} size="sm" />}
      </div>
      <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: "0 0 18px" }}>{run.machineName}</p>

      {promoted && (
        <div style={{ ...card, padding: "13px 16px", marginBottom: 16, background: "var(--sf-success-soft)", borderColor: "var(--sf-success)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--sf-success)", flex: 1 }}>Promoted to a recipe.</span>
          {run.promotedRecipeId && <Link href={`/recipes/${run.promotedRecipeId}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--sf-success)" }}>View recipe →</Link>}
        </div>
      )}

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {nodes.map((n, i) => {
          const on = sel === n.idx;
          return (
            <div key={n.idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setSel(n.idx)} className="font-mono" style={{ padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", background: on ? "var(--sf-accent)" : "var(--sf-surface-2)", color: on ? "#fff" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line)"}` }}>{n.label}</button>
              {i < nodes.length - 1 && <span style={{ color: "var(--sf-text-3)" }}>·</span>}
            </div>
          );
        })}
      </div>

      {/* Setup node */}
      {sel === 0 && (
        <div style={{ ...card, padding: "20px 22px" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 14 }}>SETUP</div>
          <SetupRow label="MATERIAL" value={run.materialName || "None"} />
          <SetupRow label="GOAL" value={`${goalMeta(run.goal).label} — ${goalMeta(run.goal).sub}`} />
          <SetupRow label="MACHINE" value={run.machineName || "None"} />
          <SetupRow label="MAPS TO" value={`${goalMeta(run.goal).process} process`} />
          {run.context && <SetupRow label="CONTEXT" value={run.context} />}
        </div>
      )}

      {/* Test node */}
      {viewingTest && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Config (current + editable only) */}
          {editable && (
            <div style={{ ...card, padding: "18px 20px" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>TEST PATTERN</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {patterns.map((p) => {
                  const on = viewingTest.pattern === p.key;
                  return <button key={p.key} type="button" disabled={busy === "config"} onClick={() => onPattern(p.key)} style={{ textAlign: "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer", background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--sf-accent)" : "var(--sf-text)" }}>{patternLabel(p.key, run.machineType)}</div>
                    <div style={{ fontSize: 10.5, color: "var(--sf-text-3)", marginTop: 1 }}>{p.sub}</div>
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* LightBurn handoff */}
          <LightburnPanel axes={viewingTest.axes} statics={viewingTest.statics} />

          {/* Your grade */}
          <div style={{ ...card, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", flex: 1 }}>{editable ? "YOUR GRADE" : "GRADE"} · TEST {viewingTest.idx} · {patternLabel(viewingTest.pattern as PatternKey, run.machineType).toUpperCase()}</div>
              {editable && (
                <div style={{ display: "flex", gap: 4, background: "var(--sf-bg)", border: "1px solid var(--sf-line-strong)", borderRadius: 9, padding: 3 }}>
                  {(["grade", "winner"] as const).map((mk) => (
                    <button key={mk} onClick={() => setMode(mk)} style={{ padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === mk ? "var(--sf-accent)" : "transparent", color: mode === mk ? "#fff" : "var(--sf-text-2)" }}>{mk === "grade" ? "Grade cells" : "★ Pick winner"}</button>
                  ))}
                </div>
              )}
            </div>
            {editable && <div style={{ fontSize: 11.5, color: "var(--sf-text-3)", marginBottom: 12 }}>{mode === "grade" ? "Click a square to cycle great → possible → bad → fail." : "Click the winning square to mark it ★."}</div>}
            <CalibrationGrid axes={viewingTest.axes} grid={editable ? grid : viewingTest.grid} best={editable ? best : viewingTest.best} editable={editable} onCellClick={onCellClick} />

            {editable && (
              <>
                <label className="font-mono" style={{ display: "block", fontSize: 9.5, letterSpacing: ".12em", color: "var(--sf-text-3)", margin: "18px 0 7px" }}>WHY DID YOU GRADE IT THIS WAY? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional, but great training data</span></label>
                <textarea value={rationale} onChange={(e) => onRationale(e.target.value)} placeholder="e.g. Row 3 col 2 is the cleanest coat removal — bright silver, sharp edges. Anything hotter starts browning the steel; the bottom row barely marked." rows={2} style={{ width: "100%", boxSizing: "border-box", background: "var(--sf-bg)", border: "1px solid var(--sf-line-strong)", borderRadius: 9, color: "var(--sf-text)", fontSize: 13, padding: "9px 11px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />

                <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadSheet(f); }} />
                  <button onClick={() => fileRef.current?.click()} disabled={busy === "upload"} style={secondaryBtn}>{viewingTest.sheetThumbUrl ? "Replace sheet photo" : "Upload sheet photo"}</button>
                  {viewingTest.sheetThumbUrl && <img src={viewingTest.sheetThumbUrl} alt="sheet" style={{ width: 46, height: 34, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sf-line)" }} />}
                  <div style={{ flex: 1 }} />
                  <button onClick={onRevealAi} disabled={busy === "grade" || gradedCount === 0} title={gradedCount === 0 ? "Grade the sheet first — then reveal the AI's take" : ""} style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: gradedCount === 0 ? "default" : "pointer", opacity: gradedCount === 0 ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
                    {busy === "grade" ? "Grading…" : viewingTest.aiGrid ? "Re-run AI grade" : "Reveal AI grade"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* AI grade — revealed after you grade, for comparison + training */}
          {viewingTest.aiGrid && (
            <div style={{ ...card, padding: "20px 22px", borderColor: "var(--sf-accent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-accent)", flex: 1 }}>AI GRADE</div>
                {agreement && (
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: agreement.pct >= 75 ? "var(--sf-success)" : agreement.pct >= 50 ? "var(--sf-warn)" : "var(--sf-danger)", background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 999, padding: "3px 10px" }}>
                    {agreement.pct}% AGREEMENT ({agreement.match}/{agreement.both})
                  </span>
                )}
              </div>
              <CalibrationGrid axes={viewingTest.axes} grid={viewingTest.aiGrid} best={viewingTest.aiBest} editable={false} />
              {viewingTest.analysis && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--sf-line)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{viewingTest.analysis.headline}</div>
                  <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: 0, lineHeight: 1.55 }}>{viewingTest.analysis.writeup}</p>
                </div>
              )}
              <p className="font-mono" style={{ fontSize: 10, color: "var(--sf-text-3)", margin: "12px 0 0" }}>YOUR GRADE STAYS AUTHORITATIVE · THE AI GRADE IS FOR COMPARISON + TRAINING</p>
            </div>
          )}

          {/* History table */}
          {tests.length > 0 && (
            <div style={{ ...card, padding: "18px 20px" }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>HISTORY</div>
              {tests.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--sf-line)" }}>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, width: 60 }}>Test {t.idx}</span>
                  <span style={{ fontSize: 12.5, color: "var(--sf-text-3)", flex: 1 }}>{patternLabel(t.pattern as PatternKey, run.machineType)}</span>
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--sf-text-2)" }}>
                    {t.best ? `${PARAM_DEFS[t.axes.y.key].short} ${formatParam(t.axes.y.key, t.best.params[t.axes.y.key])} · ${PARAM_DEFS[t.axes.x.key].short} ${formatParam(t.axes.x.key, t.best.params[t.axes.x.key])}` : "not graded"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Edge flag: best sits on a machine-range edge — refine stays clamped, so
              suggest widening the range in Machine Settings (never auto-exceed it). */}
          {editable && best && (() => {
            const exts = edgeExtensions(viewingTest.axes, best, run.machineRanges);
            if (!exts.length) return null;
            const label = exts.map((e) => `${PARAM_DEFS[e.key].label} ${e.edge === "high" ? "max" : "min"}`).join(" & ");
            return (
              <div style={{ ...card, padding: "12px 16px", background: "var(--sf-warn-soft)", borderColor: "var(--sf-warn)", display: "flex", alignItems: "center", gap: 9 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sf-warn)" strokeWidth="1.9" style={{ flex: "none" }}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                <span style={{ fontSize: 12.5, color: "var(--sf-text-2)" }}>Best square is at the <strong style={{ color: "var(--sf-warn)" }}>{label}</strong> — the true sweet spot may lie beyond your range. Refining stays within the machine&apos;s limits; to explore further, raise the range in {run.machineId ? <Link href={`/machines/${run.machineId}`} style={{ color: "var(--sf-warn)", fontWeight: 600 }}>Machine Settings</Link> : <strong>Machine Settings</strong>}.</span>
              </div>
            );
          })()}

          {/* Actions (current test) */}
          {editable && (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onRefine} disabled={busy === "refine" || !best} title={!best ? "Grade the sheet and pick a best square first" : ""} style={{ ...secondaryBtn, opacity: best ? 1 : 0.5 }}>
                {busy === "refine" ? "Refining…" : "Refine ↻"}
              </button>
              <button onClick={() => setPromoteOpen(true)} disabled={!best} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: best ? "pointer" : "default", opacity: best ? 1 : 0.5 }}>Promote →</button>
            </div>
          )}
        </div>
      )}

      {/* Promote node */}
      {sel === N + 1 && currentTest && (
        <div style={{ ...card, padding: "22px 24px", textAlign: "center" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>PROMOTE</div>
          <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "12px auto 18px", maxWidth: 440 }}>
            {promoted ? "This run has been promoted to a recipe." : best ? "Turn the recommended square into a calibrated recipe — it prefills the parameters, machine, material and process, and stamps provenance back to this run." : "Grade a test and pick a best square, then promote it to a recipe."}
          </p>
          {!promoted && <button onClick={() => setPromoteOpen(true)} disabled={!best} style={{ height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: best ? "pointer" : "default", opacity: best ? 1 : 0.5 }}>Promote to recipe</button>}
        </div>
      )}

      {promoteOpen && currentTest && (
        <PromoteModal runId={run.id} test={currentTest} goalLabel={goalMeta(run.goal).label} onClose={() => setPromoteOpen(false)} />
      )}
    </div>
  );
}

function SetupRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "1px solid var(--sf-line)" }}>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--sf-text-3)", width: 92, flex: "none" }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13.5 }}>{value}</span>
    </div>
  );
}

function LightburnPanel({ axes, statics }: { axes: TestAxes; statics: Record<string, number> }) {
  const m = lightburnMap(axes);
  const roundX = axisIsRound(axes.x);
  const roundY = axisIsRound(axes.y);
  const cell: React.CSSProperties = { background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 9, padding: "10px 12px" };
  // The held-constant params (everything the grid ISN'T sweeping) — set once.
  const staticEntries = Object.entries(statics).filter(([k]) => k in PARAM_DEFS);
  return (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 12 }}>LIGHTBURN MATERIAL TEST</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cell}>
          <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--sf-text-3)" }}>X · {m.xLabel.toUpperCase()}</div>
          <div className="font-mono" style={{ fontSize: 13, marginTop: 5 }}>Min {m.xMin} · Max {m.xMax} · Cols {m.cols}</div>
        </div>
        <div style={cell}>
          <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--sf-text-3)" }}>Y · {m.yLabel.toUpperCase()}</div>
          <div className="font-mono" style={{ fontSize: 13, marginTop: 5 }}>Min {m.yMin} · Max {m.yMax} · Rows {m.rows}</div>
        </div>
      </div>

      {/* Static params — set these ONCE; they stay constant on every square. */}
      {staticEntries.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--sf-line)" }}>
          <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--sf-text-3)", marginBottom: 8 }}>SET ONCE · CONSTANT ON EVERY CELL</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {staticEntries.map(([k, v]) => (
              <span key={k} className="font-mono" style={{ fontSize: 12, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 7, padding: "5px 10px" }}>
                {PARAM_DEFS[k as ParamKey].label} <strong style={{ color: "var(--sf-text)" }}>{formatParam(k as ParamKey, v)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {(roundX && roundY) ? (
        <div style={{ fontSize: 11.5, color: "var(--sf-success)", marginTop: 10 }}>✓ Axis values are round — ready for LightBurn.</div>
      ) : (
        <div style={{ fontSize: 11.5, color: "var(--sf-warn)", marginTop: 10 }}>⚠ Some axis values aren&apos;t round numbers — switch pattern to rebuild.</div>
      )}
    </div>
  );
}

const secondaryBtn: React.CSSProperties = { height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
