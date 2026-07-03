"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { setOnboarded } from "@/app/(app)/settings/actions";

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };

const TOPICS = [
  { title: "Machines", body: "Everything keys off your laser. Add each machine's type, wattage, bed size and setting ranges — they constrain every recipe and drive calibration grid axes." },
  { title: "Materials", body: "Document your stock: category (from your managed list), thickness, hazard level and safe ranges. Recipes and calibration reference them." },
  { title: "Recipes", body: "A proven settings set for a material + machine + process. Parameters are type-aware — a UV machine shows Q-Pulse, a CO₂ shows Power. Star the ones you reach for." },
  { title: "Attempts", body: "Log real burns with input/result photos and an outcome. Attempts build the history that refines your recipes over time." },
  { title: "Calibration Lab", body: "Run a guided test grid built from your machine's ranges, grade the squares (AI grades the sheet photo when configured), refine around the winner, then promote it straight to a recipe." },
  { title: "AI & Integrations", body: "Set an Ollama model in Settings to grade sheet photos and suggest starting settings. Your key stays server-side; suggestions are clamped to your machine's real ranges." },
];

export function HelpScreen() {
  const router = useRouter();
  async function replay() {
    await setOnboarded(false);
    router.refresh();
  }
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ ...card, padding: "28px 26px", marginBottom: 18, background: "var(--sf-accent-soft)", borderColor: "var(--sf-accent)" }}>
        <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-accent)" }}>HELP & DOCS</div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em", margin: "8px 0 6px" }}>How SpectraForge works</h1>
        <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: 0, maxWidth: 560 }}>Turn experiments into expertise — document what works, calibrate what doesn&apos;t, and let every test burn become a recipe you can trust.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sf-grid2">
        {TOPICS.map((t) => (
          <div key={t.title} style={{ ...card, padding: "18px 20px" }}>
            <h2 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{t.title}</h2>
            <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: 0, lineHeight: 1.55 }}>{t.body}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={replay} style={{ height: 40, padding: "0 16px", borderRadius: 10, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Replay welcome tour</button>
        <Link href="/settings" style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open Settings</Link>
      </div>
    </div>
  );
}
