"use client";

import { useState } from "react";

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "var(--sf-bg)", border: "1px solid var(--sf-line-strong)", borderRadius: 10, color: "var(--sf-text)", fontSize: 14 };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 6px" };

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function fmt(v: number, d = 3): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(d).replace(/\.?0+$/, "");
}

function Readout({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ background: "var(--sf-bg)", border: "1px solid var(--sf-line)", borderRadius: 10, padding: "14px 16px", marginTop: 16 }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--sf-line)" }}>
          <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--sf-text-3)", width: 130, flex: "none" }}>{k}</span>
          <span className="font-mono" style={{ fontSize: 16, color: "var(--sf-text)", fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label: l, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div>
      <label style={label as React.CSSProperties}>{l} {suffix && <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>{suffix}</span>}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </div>
  );
}

// ── Length ───────────────────────────────────────────────────────────────────
function Length() {
  const [val, setVal] = useState("1");
  const [unit, setUnit] = useState<"in" | "mm" | "cm">("in");
  const mm = unit === "in" ? n(val) * 25.4 : unit === "cm" ? n(val) * 10 : n(val);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 12 }}>
        <Field label="Value" value={val} onChange={setVal} />
        <div>
          <label style={label}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} style={{ ...input, appearance: "auto" }}>
            <option value="in">inches</option><option value="mm">mm</option><option value="cm">cm</option>
          </select>
        </div>
      </div>
      <Readout rows={[["INCHES", fmt(mm / 25.4)], ["MILLIMETERS", fmt(mm)], ["CENTIMETERS", fmt(mm / 10)]]} />
    </>
  );
}

// ── Temp ─────────────────────────────────────────────────────────────────────
function Temp() {
  const [val, setVal] = useState("20");
  const [unit, setUnit] = useState<"c" | "f">("c");
  const c = unit === "c" ? n(val) : (n(val) - 32) * (5 / 9);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 12 }}>
        <Field label="Value" value={val} onChange={setVal} />
        <div>
          <label style={label}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} style={{ ...input, appearance: "auto" }}>
            <option value="c">°C</option><option value="f">°F</option>
          </select>
        </div>
      </div>
      <Readout rows={[["CELSIUS", `${fmt(c, 2)} °C`], ["FAHRENHEIT", `${fmt(c * 9 / 5 + 32, 2)} °F`]]} />
    </>
  );
}

// ── Rotary ───────────────────────────────────────────────────────────────────
function Rotary() {
  const [dia, setDia] = useState("60");
  const [tol, setTol] = useState("18");
  const [overlap, setOverlap] = useState("2");
  const circ = Math.PI * n(dia);
  const effective = Math.max(0.1, n(tol) - n(overlap));
  const sections = n(tol) > 0 ? Math.max(1, Math.ceil(circ / effective)) : 0;
  const degPer = sections ? 360 / sections : 0;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Diameter" value={dia} onChange={setDia} suffix="mm" />
        <Field label="Focus tolerance band" value={tol} onChange={setTol} suffix="mm/section" />
        <Field label="Overlap" value={overlap} onChange={setOverlap} suffix="mm" />
      </div>
      <Readout rows={[["CIRCUMFERENCE", `${fmt(circ, 2)} mm`], ["SECTIONS", String(sections)], ["DEGREES / SECTION", `${fmt(degPer, 2)}°`], ["EFFECTIVE WIDTH", `${fmt(effective, 2)} mm`]]} />
    </>
  );
}

// ── DPI ↔ mm ─────────────────────────────────────────────────────────────────
function Dpi() {
  const [dpi, setDpi] = useState("254");
  const spacing = n(dpi) > 0 ? 25.4 / n(dpi) : 0;
  return (
    <>
      <Field label="Resolution" value={dpi} onChange={setDpi} suffix="dpi" />
      <Readout rows={[["DOT SPACING", `${fmt(spacing, 4)} mm`], ["LINE INTERVAL", `${fmt(spacing, 4)} mm`], ["DOTS / MM", fmt(n(dpi) / 25.4, 2)]]} />
    </>
  );
}

// ── Run-time ─────────────────────────────────────────────────────────────────
function RunTime() {
  const [dist, setDist] = useState("5000");
  const [speed, setSpeed] = useState("100");
  const sec = n(speed) > 0 ? n(dist) / n(speed) : 0;
  const mm = Math.floor(sec / 60);
  const ss = Math.round(sec % 60);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Travel distance" value={dist} onChange={setDist} suffix="mm" />
        <Field label="Speed" value={speed} onChange={setSpeed} suffix="mm/s" />
      </div>
      <Readout rows={[["TIME", `${fmt(sec, 1)} s`], ["MIN : SEC", `${mm}:${String(ss).padStart(2, "0")}`]]} />
    </>
  );
}

const TABS = [
  { key: "length", label: "Length", el: <Length /> },
  { key: "temp", label: "Temp", el: <Temp /> },
  { key: "rotary", label: "Rotary", el: <Rotary /> },
  { key: "dpi", label: "DPI ↔ mm", el: <Dpi /> },
  { key: "runtime", label: "Run-time", el: <RunTime /> },
];

export function ToolsScreen() {
  const [tab, setTab] = useState("length");
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Tools</h1>
      <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "0 0 20px" }}>Quick laser-bench calculators — live-computed.</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return <button key={t.key} onClick={() => setTab(t.key)} className="font-mono" style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", background: on ? "var(--sf-accent)" : "var(--sf-surface-2)", color: on ? "#fff" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line)"}` }}>{t.label}</button>;
        })}
      </div>

      <div style={{ ...card, padding: "22px 24px" }}>{active.el}</div>
    </div>
  );
}
