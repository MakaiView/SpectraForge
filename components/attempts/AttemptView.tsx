"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ParamReadout } from "@/components/params/ParamReadout";
import { Lightbox } from "@/components/attempts/Lightbox";
import { ShareCard } from "@/components/attempts/ShareCard";
import { ADDONS } from "@/lib/params/schema";
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

export function AttemptView({ attempt, onClose, onEdit }: { attempt: AttemptItem; onClose: () => void; onEdit: () => void }) {
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [share, setShare] = useState(false);
  const om = OUTCOME_META[attempt.outcome] ?? OUTCOME_META.clean;
  const addonLabels = ADDONS.filter((a) => attempt.addons.includes(a.id));

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

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={() => setShare(true)} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Share</button>
          <button onClick={onEdit} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
        </div>
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
