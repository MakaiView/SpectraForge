"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrystalMark } from "@/components/shell/Logo";
import { setOnboarded } from "@/app/(app)/settings/actions";

const STEPS = [
  { icon: "prism", title: "Welcome to SpectraForge", body: "Your bench brain for laser work — document what works, calibrate what doesn't, and turn every test burn into a recipe you can trust." },
  { icon: "machine", title: "Start with your machine", body: "Everything keys off your laser. Add your machine's type, wattage, bed size and setting ranges once — the app tailors every recipe, calibration grid and tool to it." },
  { icon: "grid", title: "Calibrate, then capture", body: "Run a guided calibration in the Lab, grade the results, and promote the sweet spot straight to a recipe. Log attempts with photos as you go." },
];

function StepIcon({ name }: { name: string }) {
  if (name === "prism") return <CrystalMark width={44} height={31} gradId="sfCryOnboard" />;
  if (name === "machine")
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sf-accent)" strokeWidth="1.6"><rect x="3" y="4" width="18" height="8" rx="1.5" /><path d="M7 12v3M17 12v3M5 18h14" /><circle cx="12" cy="8" r="1.4" fill="var(--sf-accent)" stroke="none" /></svg>
    );
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sf-accent)" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>;
}

/** First-run 3-step welcome, gated by user_settings.onboarded. Replayable from
 *  Help. "Add your machine" jumps to Machines. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  async function finish(goToMachines: boolean) {
    setClosing(true);
    await setOnboarded(true);
    if (goToMachines) router.push("/machines");
    else router.refresh();
  }

  if (closing) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(6,9,14,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 16, boxShadow: "var(--sf-e2)", width: "100%", maxWidth: 440, padding: "30px 28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><StepIcon name={s.icon} /></div>
        <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 10px" }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "0 auto 22px", maxWidth: 340, lineHeight: 1.55 }}>{s.body}</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
          {STEPS.map((_, i) => (<span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 999, background: i === step ? "var(--sf-accent)" : "var(--sf-surface-3)", transition: "width .15s ease" }} />))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => finish(false)} style={{ border: "none", background: "none", color: "var(--sf-text-3)", fontSize: 13, cursor: "pointer" }}>Skip</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button onClick={() => setStep(step - 1)} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Back</button>}
            {last ? (
              <button onClick={() => finish(true)} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add your machine</button>
            ) : (
              <button onClick={() => setStep(step + 1)} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
