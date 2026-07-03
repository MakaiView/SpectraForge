export type BadgeTone = "accent" | "muted" | "success" | "warn" | "danger" | "neutral";

const TONES: Record<BadgeTone, { c: string; b: string }> = {
  accent: { c: "var(--sf-accent)", b: "var(--sf-accent-soft)" },
  muted: { c: "var(--sf-text-3)", b: "var(--sf-surface-3)" },
  success: { c: "var(--sf-success)", b: "var(--sf-success-soft)" },
  warn: { c: "var(--sf-warn)", b: "var(--sf-warn-soft)" },
  danger: { c: "var(--sf-danger)", b: "var(--sf-danger-soft)" },
  neutral: { c: "var(--sf-text-2)", b: "var(--sf-surface-2)" },
};

/** Uppercase mono pill badge — the app's status/role/hazard chip. */
export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="font-mono"
      style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", color: t.c, background: t.b, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}
    >
      {children}
    </span>
  );
}

/** Status → tone + label for recipes (draft | cal | review | fail). */
export function recipeStatusBadge(status: string): { tone: BadgeTone; label: string } {
  switch (status) {
    case "cal":
      return { tone: "success", label: "Calibrated" };
    case "review":
      return { tone: "warn", label: "Review" };
    case "fail":
      return { tone: "danger", label: "Fail" };
    default:
      return { tone: "muted", label: "Draft" };
  }
}

/** Hazard → tone + label (low | medium | high). */
export function hazardBadge(hazard: string): { tone: BadgeTone; label: string } {
  switch (hazard) {
    case "high":
      return { tone: "danger", label: "High hazard" };
    case "medium":
      return { tone: "warn", label: "Medium hazard" };
    default:
      return { tone: "success", label: "Low hazard" };
  }
}
