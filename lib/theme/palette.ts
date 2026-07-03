/**
 * Accent palette ("the beam") — the single user-selectable accent applied
 * app-wide to active/calibrated state. Values lifted verbatim from the
 * prototype's PAL object (4 curated accents). Each has dark `d`, dark-strong
 * `ds`, light `l`, light-strong `ls`.
 */

export type AccentKey = "azure" | "electric" | "cyan" | "cobalt";

export interface Accent {
  d: string;
  ds: string;
  l: string;
  ls: string;
  label: string;
}

export const PAL: Record<AccentKey, Accent> = {
  azure: { d: "#3f97ff", ds: "#67adff", l: "#1f74e6", ls: "#1666cf", label: "Azure" },
  electric: { d: "#6a7bff", ds: "#8a98ff", l: "#4453e6", ls: "#3a48cf", label: "Electric" },
  cyan: { d: "#25c2e6", ds: "#54d4f0", l: "#0b93b8", ls: "#0a83a4", label: "Cyan" },
  cobalt: { d: "#3a64f0", ds: "#5d82f6", l: "#2748d6", ls: "#2240bf", label: "Cobalt" },
};

export const DEFAULT_ACCENT: AccentKey = "azure";

export type ThemeMode = "dark" | "light";

/** Brand orange for the "Forge" wordmark + type accent (README §Design Tokens). */
export const FORGE_ORANGE = "#f5872f";

/** Convert an r,g,b hex to `rgba(r,g,b,a)` for soft/ring accent derivations. */
function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Build the inline CSS-var overrides for a given accent + theme. Applied on the
 * root element so accent switching stays a one-attribute swap alongside data-sf.
 * Soft/ring opacities mirror the token spec (dark .14/.40, light .10/.38).
 */
export function accentVars(accent: AccentKey, mode: ThemeMode): Record<string, string> {
  const p = PAL[accent] ?? PAL[DEFAULT_ACCENT];
  const base = mode === "light" ? p.l : p.d;
  const strong = mode === "light" ? p.ls : p.ds;
  const softA = mode === "light" ? 0.1 : 0.14;
  const ringA = mode === "light" ? 0.38 : 0.4;
  return {
    "--sf-accent": base,
    "--sf-accent-strong": strong,
    "--sf-accent-soft": rgba(base, softA),
    "--sf-accent-ring": rgba(base, ringA),
  };
}
