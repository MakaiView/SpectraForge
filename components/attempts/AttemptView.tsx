"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ParamReadout } from "@/components/params/ParamReadout";
import { Lightbox } from "@/components/attempts/Lightbox";
import { ShareCard } from "@/components/attempts/ShareCard";
import { adviseAttempt } from "@/app/(app)/attempts/actions";
import { ADDONS } from "@/lib/params/schema";
import type { Advice } from "@/lib/ai/advise";
import type { AttemptItem } from "@/components/attempts/AttemptsScreen";

export const OUTCOME_META: Record<string, { label: string; tone: "success" | "warn" | "danger"; color: string }> = {
  clean: { label: "Clean", tone: "success", color: "var(--sf-success)" },
  marginal: { label: "Marginal", tone: "warn", color: "var(--sf-warn)" },
  fail: { label: "Fail", tone: "danger", color: "var(--sf-danger)" },
};

function PhotoTile({ label, thumb, full, onOpen }: { label: string; thumb: string | null; full: string | null; onOpen: () => void }) {
  return (
    <div>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--sf-text-3)", marginBottom: 7 }}>{label}</div>
      <div onClick={thumb ? onOpen : undefined} style={{ aspectRatio: "4 / 3", borderRadius: 11, overflow: "hidden", background: "var(--sf-bg)", border: "1px solid var(--sf-line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: thumb ? "zoom-in" : "default" }}>
        {thumb ? <img src={thumb} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 12, color: "var(--sf-text-3)" }}>No photo</span>}
      </div>
      {full ? null : null}
    </div>
  );
}

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function AttemptView({ attempt, aiConfigured, onClose, onEdit }: { attempt: AttemptItem; aiConfigured: boolean; onClose: () => void; onEdit: () => void }) {
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [share, setShare] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(attempt.aiAdvice);
  const [busy, setBusy] = useState(false);
  const [adviceErr, setAdviceErr] = useState("");
  const om = OUTCOME_META[attempt.outcome] ?? OUTCOME_META.clean;
  const addonLabels = ADDONS.filter((a) => attempt.addons.includes(a.id));

  async function runAdvice() {
    setBusy(true);
    setAdviceErr("");
    try {
      const res = await adviseAttempt(attempt.id);
      if (res.ok) setAdvice(res.advice);
      else setAdviceErr(res.error);
    } catch {
      setAdviceErr("The advice request failed. Check the AI connection in Settings and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal onClose={onClose} title={attempt.material_name || "Attempt"} maxWidth={620}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--sf-text-3)", textTransform: "uppercase" }}>{[attempt.process, attempt.machineName].filter(Boolean).join(" · ")}</span>
          <Badge tone={om.tone}>{om.label}</Badge>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--sf-text-3)" }}>{attempt.dateLabel}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <PhotoTile label="INPUT" thumb={attempt.inputThumbUrl} full={attempt.inputFullUrl} onOpen={() => attempt.inputFullUrl && setLightbox({ url: attempt.inputFullUrl, alt: "Input photo" })} />
          <PhotoTile label="RESULT" thumb={attempt.resultThumbUrl} full={attempt.resultFullUrl} onOpen={() => attempt.resultFullUrl && setLightbox({ url: attempt.resultFullUrl, alt: "Result photo" })} />
        </div>

        <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", marginBottom: 10 }}>SETTINGS</div>
        {attempt.machineType ? <ParamReadout type={attempt.machineType} params={attempt.params} /> : <p style={{ fontSize: 13, color: "var(--sf-text-3)", margin: 0 }}>No machine linked.</p>}

        {addonLabels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
            {addonLabels.map((a) => <span key={a.id} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", color: "var(--sf-text-2)" }}>{a.label}</span>)}
          </div>
        )}

        {attempt.note && <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "16px 0 0", lineHeight: 1.5 }}>{attempt.note}</p>}

        {/* AI advice */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--sf-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: advice || adviceErr ? 12 : 0 }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", flex: 1 }}>AI ADVICE</div>
            {advice && <span style={{ fontSize: 11, color: "var(--sf-text-3)" }}>reviewed {relTime(advice.at)}</span>}
            {aiConfigured ? (
              <button
                onClick={runAdvice}
                disabled={busy}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 13px", borderRadius: 9, border: advice ? "1px solid var(--sf-line-strong)" : "none", background: advice ? "var(--sf-surface-2)" : "var(--sf-accent)", color: advice ? "var(--sf-text)" : "#fff", fontSize: 12.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={busy ? { animation: "sfSpin .9s linear infinite" } : undefined}>{busy ? <path d="M21 12a9 9 0 1 1-2.64-6.36" /> : <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />}</svg>
                {busy ? "Analyzing…" : advice ? "Re-run" : "Ask AI"}
              </button>
            ) : (
              <Link href="/settings" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--sf-accent)", textDecoration: "none" }}>Set up AI →</Link>
            )}
          </div>

          {!advice && !adviceErr && !busy && (
            <p style={{ fontSize: 12.5, color: "var(--sf-text-3)", margin: "8px 0 0" }}>
              {aiConfigured ? "Get a read on this burn and concrete setting changes from the photos + settings." : "Configure the AI assistant to get advice on your attempts."}
            </p>
          )}

          {adviceErr && (
            <div style={{ padding: "9px 11px", background: "var(--sf-danger-soft)", border: "1px solid var(--sf-danger)", borderRadius: 9, color: "var(--sf-danger)", fontSize: 12.5, fontWeight: 500 }}>{adviceErr}</div>
          )}

          {advice && (
            <div style={{ background: "var(--sf-accent-soft)", border: "1px solid var(--sf-accent)", borderRadius: 11, padding: "14px 16px" }}>
              <p style={{ fontSize: 13.5, color: "var(--sf-text)", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{advice.summary}</p>
              {advice.cause && <p style={{ fontSize: 12.5, color: "var(--sf-text-2)", margin: "8px 0 0", lineHeight: 1.5 }}><strong>Likely cause:</strong> {advice.cause}</p>}
              {advice.suggestions.length > 0 && (
                <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                  {advice.suggestions.map((s, i) => (
                    <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sf-accent)" strokeWidth="2.2" style={{ flex: "none", marginTop: 2 }}><path d="M5 12l5 5 9-11" /></svg>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sf-text)" }}>{s.change}</div>
                        {s.why && <div style={{ fontSize: 12, color: "var(--sf-text-3)", marginTop: 1 }}>{s.why}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "var(--sf-text-3)", textTransform: "uppercase" }}>Confidence: {advice.confidence}</span>
                <span style={{ fontSize: 11, color: "var(--sf-text-3)" }}>· AI guidance, not a guarantee — verify on a test cut.</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={() => setShare(true)} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Share</button>
          <button onClick={onEdit} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
        </div>
        <style>{`@keyframes sfSpin{to{transform:rotate(360deg)}}`}</style>
      </Modal>

      {lightbox && <Lightbox url={lightbox.url} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {share && (
        <ShareCard
          onClose={() => setShare(false)}
          data={{
            title: attempt.material_name || "Attempt",
            subtitle: [attempt.process, attempt.machineName, attempt.dateLabel].filter(Boolean).join(" · "),
            outcome: om.label,
            outcomeColor: om.color,
            machineType: attempt.machineType,
            params: attempt.params,
            photoUrl: attempt.resultFullUrl || attempt.inputFullUrl,
          }}
        />
      )}
    </>
  );
}
