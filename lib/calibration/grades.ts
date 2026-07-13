import type { Grade } from "@/lib/calibration/engine";
import type { BadgeTone } from "@/components/ui/Badge";

/**
 * The 4-level result scale, used identically for calibration grid cells AND
 * per-attempt outcomes (BUILD_SPEC §5c). Great = the result you want; Possible =
 * usable but not ideal; Bad = marked but clearly wrong; Fail = the two ruinous
 * extremes — it burned through/destroyed the material, OR it barely marked at
 * all. One source of truth for label, cell glyph, and colors.
 */
export const GRADE_ORDER = ["great", "possible", "bad", "fail"] as const;
export type ResultGrade = (typeof GRADE_ORDER)[number];

export interface GradeStyle {
  label: string;
  symbol: string;
  tone: BadgeTone;
  bg: string;
  border: string;
  color: string;
}

export const GRADE_META: Record<Grade, GradeStyle> = {
  ungraded: { label: "Ungraded", symbol: "", tone: "muted", bg: "var(--sf-surface-2)", border: "var(--sf-line)", color: "var(--sf-text-3)" },
  great: { label: "Great", symbol: "✓", tone: "success", bg: "var(--sf-success-soft)", border: "var(--sf-success)", color: "var(--sf-success)" },
  possible: { label: "Possible", symbol: "~", tone: "accent", bg: "var(--sf-accent-soft)", border: "var(--sf-accent)", color: "var(--sf-accent)" },
  bad: { label: "Bad", symbol: "!", tone: "warn", bg: "var(--sf-warn-soft)", border: "var(--sf-warn)", color: "var(--sf-warn)" },
  fail: { label: "Fail", symbol: "✕", tone: "danger", bg: "var(--sf-danger-soft)", border: "var(--sf-danger)", color: "var(--sf-danger)" },
};

// Grids graded before the scale change stored clean/partial/fail — map them so
// old runs still render (clean→great, partial→possible, fail→fail).
const LEGACY: Record<string, Grade> = { clean: "great", partial: "possible", marginal: "possible" };

export function normalizeGrade(g: string): Grade {
  if (g in GRADE_META) return g as Grade;
  return LEGACY[g] ?? "ungraded";
}

export function gradeMeta(g: string): GradeStyle {
  return GRADE_META[normalizeGrade(g)];
}
