"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PARAM_DEFS, TYPE_PARAMS, formatParam, MACHINE_TYPES, type MachineTypeKey } from "@/lib/params/schema";
import { FORGE_ORANGE } from "@/lib/theme/palette";
import type { ParamValues } from "@/components/params/ParamReadout";

export interface ShareCardData {
  title: string;          // material name (or recipe name)
  subtitle: string;       // process · machine · thickness
  outcome: string;        // Clean / Marginal / Fail (or status)
  outcomeColor: string;
  machineType: MachineTypeKey | null;
  params: ParamValues;
  photoUrl: string | null; // signed URL of the result/input photo
}

const W = 1000;
const H = 620;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
}

/** Load a cross-origin image as a same-origin object URL so the canvas isn't
 *  tainted (toBlob would otherwise throw). Returns null if it can't be fetched. */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objUrl;
    });
    URL.revokeObjectURL(objUrl);
    return img;
  } catch {
    return null;
  }
}

export function ShareCard({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = cssVar("--sf-bg");
      const surface = cssVar("--sf-surface");
      const text = cssVar("--sf-text");
      const text2 = cssVar("--sf-text-2");
      const text3 = cssVar("--sf-text-3");
      const line = cssVar("--sf-line");
      const accent = cssVar("--sf-accent");

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // faint grid texture
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;

      const pad = 44;

      // wordmark
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 30px Sora, sans-serif";
      ctx.fillStyle = text;
      ctx.fillText("Spectra", pad, 62);
      const w = ctx.measureText("Spectra").width;
      ctx.fillStyle = FORGE_ORANGE;
      ctx.fillText("Forge", pad + w, 62);

      // outcome badge (top-right)
      ctx.font = "600 15px 'JetBrains Mono', monospace";
      const badge = data.outcome.toUpperCase();
      const bw = ctx.measureText(badge).width + 28;
      ctx.fillStyle = data.outcomeColor;
      ctx.globalAlpha = 0.16;
      roundRect(ctx, W - pad - bw, 38, bw, 32, 16); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = data.outcomeColor;
      ctx.fillText(badge, W - pad - bw + 14, 60);

      // title + subtitle
      ctx.fillStyle = text;
      ctx.font = "700 42px Sora, sans-serif";
      ctx.fillText(trunc(ctx, data.title || "Attempt", W - pad * 2), pad, 138);
      ctx.fillStyle = text3;
      ctx.font = "500 18px 'JetBrains Mono', monospace";
      ctx.fillText(trunc(ctx, data.subtitle, W - pad * 2), pad, 170);

      // divider
      ctx.strokeStyle = line;
      ctx.beginPath(); ctx.moveTo(pad, 196); ctx.lineTo(W - pad, 196); ctx.stroke();

      // Left: params. Right: photo.
      const photoW = 360;
      const leftW = W - pad * 2 - photoW - 28;
      const keys = data.machineType ? TYPE_PARAMS[data.machineType] : [];
      let py = 246;
      for (const key of keys) {
        const def = PARAM_DEFS[key];
        const val = data.params[key];
        const shown = val === null || val === undefined ? "—" : formatParam(key, val as number);
        ctx.fillStyle = text3;
        ctx.font = "600 13px 'JetBrains Mono', monospace";
        ctx.fillText(def.short, pad, py);
        ctx.fillStyle = text;
        ctx.font = "600 26px Sora, sans-serif";
        ctx.fillText(shown, pad, py + 30);
        py += 66;
        if (py > H - 60) break;
      }
      if (data.machineType) {
        ctx.fillStyle = accent;
        ctx.font = "600 13px 'JetBrains Mono', monospace";
        ctx.fillText(MACHINE_TYPES[data.machineType].label.toUpperCase() + " · TYPE-AWARE", pad, H - 40);
      }

      // Photo region (contained/letterboxed — never cropped, §8)
      const px = W - pad - photoW;
      const pyTop = 220;
      const phH = H - pyTop - 44;
      ctx.fillStyle = surface;
      roundRect(ctx, px, pyTop, photoW, phH, 14); ctx.fill();
      if (data.photoUrl) {
        const img = await loadImage(data.photoUrl);
        if (!cancelled && img) {
          const scale = Math.min(photoW / img.width, phH / img.height);
          const dw = img.width * scale, dh = img.height * scale;
          const dx = px + (photoW - dw) / 2, dy = pyTop + (phH - dh) / 2;
          ctx.save();
          roundRect(ctx, px, pyTop, photoW, phH, 14); ctx.clip();
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = text2;
        ctx.font = "500 15px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("No photo", px + photoW / 2, pyTop + phH / 2);
        ctx.textAlign = "left";
      }

      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [data]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.title || "spectraforge").replace(/\s+/g, "-").toLowerCase()}-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function copyText() {
    const keys = data.machineType ? TYPE_PARAMS[data.machineType] : [];
    const lines = [
      data.title,
      data.subtitle,
      `Outcome: ${data.outcome}`,
      "",
      ...keys.map((k) => {
        const v = data.params[k];
        return `${PARAM_DEFS[k].label}: ${v === null || v === undefined ? "—" : formatParam(k, v as number)}`;
      }),
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
  }

  return (
    <Modal onClose={onClose} title="Share card" maxWidth={720}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid var(--sf-line)", display: "block" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={copyText} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy settings as text</button>
        <button onClick={download} disabled={!ready} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.6 }}>Download PNG</button>
      </div>
    </Modal>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function trunc(ctx: CanvasRenderingContext2D, s: string, max: number): string {
  if (ctx.measureText(s).width <= max) return s;
  let out = s;
  while (out.length > 1 && ctx.measureText(out + "…").width > max) out = out.slice(0, -1);
  return out + "…";
}
