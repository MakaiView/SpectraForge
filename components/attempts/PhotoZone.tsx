"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A single photo upload zone (input or result). Holds a newly-picked File in
 * parent state; shows a preview from the File or an existing signed URL. The
 * image is bound as a real <img src> — never a data-URL in a style string
 * (BUILD_SPEC §8).
 *
 * On touch devices (coarse pointer) tapping the zone opens a small sheet to pick
 * the source — Camera / Photo library / File — since a phone/tablet can supply an
 * image three different ways. On desktop it goes straight to the file browser.
 * SVG is accepted (used for design/line-art input art) and rasterized on ingest.
 */
export function PhotoZone({
  label,
  file,
  existingUrl,
  onPick,
  onClear,
}: {
  label: string;
  file: File | null;
  existingUrl: string | null;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [menu, setMenu] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    // Phones + tablets (incl. iPads, which report maxTouchPoints but a fine
    // pointer when a trackpad is attached) get the source sheet.
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    setTouch(coarse || (navigator.maxTouchPoints ?? 0) > 0);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Close the source menu on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // One hidden input; set accept/capture per source right before opening it.
  function pick(source: "camera" | "library" | "file") {
    const el = inputRef.current;
    if (!el) return;
    if (source === "camera") {
      el.setAttribute("accept", "image/*");
      el.setAttribute("capture", "environment");
    } else if (source === "library") {
      el.setAttribute("accept", "image/*,.svg");
      el.removeAttribute("capture");
    } else {
      // "File" → the Files app / document browser, where SVG & other art live.
      el.setAttribute("accept", "image/*,.svg,application/pdf");
      el.removeAttribute("capture");
    }
    el.value = "";
    el.click();
    setMenu(false);
  }

  function openSource() {
    if (touch) setMenu((v) => !v);
    else pick("library"); // desktop: straight to the file browser
  }

  const shown = preview || existingUrl;

  return (
    <div>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--sf-text-3)", marginBottom: 7 }}>{label}</div>
      <div ref={zoneRef} style={{ position: "relative" }}>
        <div
          onClick={openSource}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f && (f.type.startsWith("image/") || /\.svg$/i.test(f.name))) onPick(f); }}
          style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 11, cursor: "pointer", overflow: "hidden", background: "var(--sf-bg)", border: `1.5px dashed ${drag ? "var(--sf-accent)" : "var(--sf-line-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {shown ? (
            // Contained (letterboxed), not cropped (BUILD_SPEC §8).
            <img src={shown} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "var(--sf-text-3)", padding: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ marginBottom: 6 }}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-6 6" /></svg>
              <div style={{ fontSize: 12 }}>{touch ? "Tap to add" : "Drop or click to add"}</div>
            </div>
          )}
          {shown && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); if (inputRef.current) inputRef.current.value = ""; }}
              aria-label="Remove photo"
              style={{ position: "absolute", top: 7, right: 7, width: 26, height: 26, borderRadius: 999, border: "none", background: "rgba(6,9,14,.62)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>

        {/* Touch source sheet: Camera / Photo library / File */}
        {menu && (
          <div
            style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 40, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line-strong)", borderRadius: 12, boxShadow: "var(--sf-e2)", padding: 6 }}
          >
            {[
              { key: "camera" as const, label: "Take photo", icon: <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.4" /><path d="M8 6l1.5-2h5L16 6" /></> },
              { key: "library" as const, label: "Photo library", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-6 6" /></> },
              { key: "file" as const, label: "Choose file (SVG, PDF…)", icon: <><path d="M14 3v5h5" /><path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /></> },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); pick(opt.key); }}
                style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 9, border: "none", background: "none", cursor: "pointer", textAlign: "left", color: "var(--sf-text)", fontSize: 14, fontWeight: 500 }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ flex: "none", color: "var(--sf-text-2)" }}>{opt.icon}</svg>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*,.svg" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
    </div>
  );
}
