"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CategoryManager } from "@/components/materials/CategoryManager";
import type { Category } from "@/components/materials/MaterialForm";
import { PAL, type AccentKey, type ThemeMode } from "@/lib/theme/palette";
import { saveAppearance, saveNotifications, saveAiConfig, saveCardIdentity, testAiConnection } from "@/app/(app)/settings/actions";

export interface SettingsData {
  theme: string;
  accent: string;
  ai_provider: string;
  ai_model: string;
  ai_base_url: string;
  hasApiKey: boolean;
  notif_calibration: boolean;
  notif_review: boolean;
  notif_tips: boolean;
  card_identity: string;
}

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "var(--sf-bg)", border: "1px solid var(--sf-line-strong)", borderRadius: 10, color: "var(--sf-text)", fontSize: 14 };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 6px" };

function Section({ kicker, title, desc, children }: { kicker: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: "20px 22px" }}>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)" }}>{kicker}</div>
      <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, margin: "6px 0 2px" }}>{title}</h2>
      {desc && <p style={{ fontSize: 12.5, color: "var(--sf-text-3)", margin: "0 0 16px" }}>{desc}</p>}
      <div style={{ marginTop: desc ? 0 : 14 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} style={{ width: 44, height: 25, borderRadius: 999, border: "none", cursor: "pointer", background: on ? "var(--sf-accent)" : "var(--sf-surface-3)", position: "relative", flex: "none" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 19, height: 19, borderRadius: 999, background: "#fff", transition: "left .15s ease" }} />
    </button>
  );
}

export function SettingsScreen({ settings, categories }: { settings: SettingsData; categories: Category[] }) {
  const router = useRouter();
  const { mode, accent, setMode, setAccent } = useTheme();
  const [saved, setSaved] = useState(false);
  const [managingCats, setManagingCats] = useState(false);

  // AI form state
  const [provider, setProvider] = useState(settings.ai_provider);
  const [model, setModel] = useState(settings.ai_model);
  const [baseUrl, setBaseUrl] = useState(settings.ai_base_url);
  const [apiKey, setApiKey] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Notifications
  const [notif, setNotif] = useState({ calibration: settings.notif_calibration, review: settings.notif_review, tips: settings.notif_tips });
  const [cardIdentity, setCardIdentity] = useState(settings.card_identity);

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function pickTheme(m: ThemeMode) {
    setMode(m);
    saveAppearance(m, accent).then(flashSaved);
  }
  function pickAccent(a: AccentKey) {
    setAccent(a);
    saveAppearance(mode, a).then(flashSaved);
  }
  function toggleNotif(key: "calibration" | "review" | "tips") {
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    saveNotifications(next).then(flashSaved);
  }
  function pickCardIdentity(v: string) {
    setCardIdentity(v);
    saveCardIdentity(v).then(flashSaved);
  }
  async function saveAi() {
    setAiBusy(true); setAiMsg("");
    const res = await saveAiConfig({ provider, model, base_url: baseUrl, api_key: apiKey });
    setAiBusy(false);
    if (!res.ok) return setAiMsg(res.error);
    setApiKey("");
    setAiMsg("Saved.");
    router.refresh();
  }
  async function testAi() {
    setTesting(true); setTestResult(null);
    // Test the current form values (falling back to the saved key server-side).
    try {
      const res = await testAiConnection({ model, base_url: baseUrl, api_key: apiKey });
      setTestResult(res);
    } catch {
      setTestResult({ ok: false, message: "The test request failed to reach the server." });
    } finally {
      setTesting(false);
    }
  }

  const isOllama = provider === "ollama";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: 0, flex: 1 }}>Settings</h1>
        {saved && <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--sf-success)", background: "var(--sf-success-soft)", padding: "5px 11px", borderRadius: 999 }}>Saved ✓</span>}
      </div>

      {/* Appearance */}
      <Section kicker="APPEARANCE" title="Theme & accent" desc="Dark by default. The accent — “the beam” — marks active and calibrated state app-wide.">
        <label style={label}>Theme</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {(["dark", "light"] as ThemeMode[]).map((m) => {
            const on = mode === m;
            return (
              <button key={m} onClick={() => pickTheme(m)} style={{ flex: 1, padding: "14px 12px", borderRadius: 11, cursor: "pointer", textAlign: "left", textTransform: "capitalize", fontSize: 13.5, fontWeight: 600, background: m === "dark" ? "#0d1016" : "#eaeef4", color: m === "dark" ? "#eef2f8" : "#121823", border: `2px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>
                {m}
              </button>
            );
          })}
        </div>
        <label style={label}>Accent</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(Object.keys(PAL) as AccentKey[]).map((k) => {
            const p = PAL[k];
            const color = mode === "light" ? p.l : p.d;
            const on = accent === k;
            return (
              <button key={k} onClick={() => pickAccent(k)} title={p.label} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px 7px 8px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: on ? "var(--sf-surface-3)" : "var(--sf-bg)", color: "var(--sf-text)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>
                <span style={{ width: 18, height: 18, borderRadius: 999, background: color, border: "2px solid var(--sf-surface)" }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* AI & Integrations */}
      <Section kicker="AI & INTEGRATIONS" title="Model provider" desc="Server-side only — your key never reaches the browser. Ollama Cloud is the wired provider; grading and suggestions call it when set.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ ...input, appearance: "auto" }}>
              <option value="ollama">Ollama</option>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div>
            <label style={label}>Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. qwen2.5-vl:7b" style={input} />
          </div>
        </div>
        {isOllama && (
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Base URL</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://ollama.com" style={input} />
          </div>
        )}
        <label style={label}>API key {settings.hasApiKey && <span style={{ color: "var(--sf-success)", fontWeight: 500 }}>· saved</span>}</label>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder={settings.hasApiKey ? "•••••••• (leave blank to keep)" : "Paste your key"} autoComplete="off" style={input} />
        {!isOllama && <p style={{ fontSize: 12, color: "var(--sf-warn)", margin: "10px 0 0" }}>Only Ollama is wired to real calls today; other providers store config for later.</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={saveAi} disabled={aiBusy} style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{aiBusy ? "Saving…" : "Save AI config"}</button>
          <button onClick={testAi} disabled={testing} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M5 12l4 4L19 6" /></svg>
            {testing ? "Testing…" : "Test connection"}
          </button>
          {aiMsg && <span style={{ fontSize: 12.5, color: aiMsg === "Saved." ? "var(--sf-success)" : "var(--sf-danger)" }}>{aiMsg}</span>}
        </div>
        {testResult && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, background: testResult.ok ? "var(--sf-success-soft)" : "var(--sf-danger-soft)", border: `1px solid ${testResult.ok ? "var(--sf-success)" : "var(--sf-danger)"}`, color: testResult.ok ? "var(--sf-success)" : "var(--sf-danger)" }}>
            {testResult.ok
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: "none" }}><path d="M5 12l4 4L19 6" /></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: "none" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>}
            <span>{testResult.message}</span>
          </div>
        )}
      </Section>

      {/* Material Categories */}
      <Section kicker="LIBRARY" title="Material categories" desc="The managed list that feeds the material category dropdown.">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13, color: "var(--sf-text-2)" }}>{categories.length} categor{categories.length === 1 ? "y" : "ies"}</div>
          <button onClick={() => setManagingCats(true)} style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Manage</button>
        </div>
      </Section>

      {/* Notifications */}
      <Section kicker="NOTIFICATIONS" title="What to surface">
        {[
          { key: "calibration" as const, title: "Calibration updates", sub: "When a run is graded or ready to promote" },
          { key: "review" as const, title: "Needs review", sub: "When a recipe or attempt is flagged" },
          { key: "tips" as const, title: "Tips & product news", sub: "Occasional guidance and updates" },
        ].map((n, i) => (
          <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sf-line)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--sf-text-3)", marginTop: 2 }}>{n.sub}</div>
            </div>
            <Toggle on={notif[n.key]} onClick={() => toggleNotif(n.key)} />
          </div>
        ))}
      </Section>

      {/* Share-card identity */}
      <Section kicker="SHARE CARDS" title="Card identity" desc="What to show on generated share cards.">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { v: "name", l: "Name" },
            { v: "company", l: "Company" },
            { v: "both", l: "Both" },
            { v: "neither", l: "Neither" },
          ].map((o) => {
            const on = cardIdentity === o.v;
            return <button key={o.v} onClick={() => pickCardIdentity(o.v)} style={{ padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: on ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: on ? "var(--sf-accent)" : "var(--sf-text-2)", border: `1px solid ${on ? "var(--sf-accent)" : "var(--sf-line-strong)"}` }}>{o.l}</button>;
          })}
        </div>
      </Section>

      {managingCats && <CategoryManager categories={categories} onClose={() => setManagingCats(false)} />}
    </div>
  );
}
