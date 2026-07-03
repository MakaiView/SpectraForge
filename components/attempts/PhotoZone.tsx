"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A single photo upload zone (input or result). Holds a newly-picked File in
 * parent state; shows a preview from the File or an existing signed URL. The
 * image is bound as a real <img src> — never a data-URL in a style string
 * (BUILD_SPEC §8).
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
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || existingUrl;

  return (
    <div>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--sf-text-3)", marginBottom: 7 }}>{label}</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith("image/")) onPick(f); }}
        style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 11, cursor: "pointer", overflow: "hidden", background: "var(--sf-bg)", border: `1.5px dashed ${drag ? "var(--sf-accent)" : "var(--sf-line-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {shown ? (
          // Contained (letterboxed), not cropped (BUILD_SPEC §8).
          <img src={shown} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ textAlign: "center", color: "var(--sf-text-3)", padding: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ marginBottom: 6 }}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-6 6" /></svg>
            <div style={{ fontSize: 12 }}>Drop or click to add</div>
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
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
    </div>
  );
}
