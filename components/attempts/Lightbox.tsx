"use client";

import { useEffect } from "react";

/** Fullscreen image lightbox. Click anywhere or Esc to close. */
export function Lightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(4,7,12,.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, cursor: "zoom-out" }}>
      <img src={url} alt={alt} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "var(--sf-e2)" }} />
      <button onClick={onClose} aria-label="Close" style={{ position: "fixed", top: 20, right: 22, width: 38, height: 38, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
