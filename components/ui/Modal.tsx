"use client";

import { useEffect } from "react";

const cardStyle: React.CSSProperties = {
  background: "var(--sf-surface)",
  border: "1px solid var(--sf-line)",
  borderRadius: 14,
  boxShadow: "var(--sf-e2)",
};

/** Backdrop + centered card. Click-outside and Esc close. */
export function Modal({
  onClose,
  title,
  children,
  maxWidth = 460,
  footer,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="sf-modalwrap"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(6,9,14,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} className="sf-modal" style={{ ...cardStyle, width: "100%", maxWidth, margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 0" }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-text-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
        {footer && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0 20px 20px" }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Shared input/label styles for forms. */
export const fieldInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  background: "var(--sf-bg)",
  border: "1px solid var(--sf-line-strong)",
  borderRadius: 10,
  color: "var(--sf-text)",
  fontSize: 14,
};
export const fieldLabel: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 6px" };

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{ marginTop: 12, padding: "9px 11px", background: "var(--sf-danger-soft)", border: "1px solid var(--sf-danger)", borderRadius: 9, color: "var(--sf-danger)", fontSize: 12.5, fontWeight: 500 }}>
      {message}
    </div>
  );
}

export function ModalButtons({ onCancel, onSave, saving, saveLabel = "Save" }: { onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel?: string }) {
  return (
    <>
      <button onClick={onCancel} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <button onClick={onSave} disabled={saving} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : saveLabel}
      </button>
    </>
  );
}
