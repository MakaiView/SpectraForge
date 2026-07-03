import type { ParamKey, MachineTypeKey } from "@/lib/params/schema";
import { TYPE_PARAMS } from "@/lib/params/schema";

/** GOALS — id · label · sub · maps to process (DATA_MODEL). */
export type GoalKey = "cut" | "engrave" | "deep" | "photo" | "mark" | "color" | "coat" | "char";

export interface Goal {
  key: GoalKey;
  label: string;
  sub: string;
  process: "cut" | "engrave" | "mark";
}

export const GOALS: Goal[] = [
  { key: "cut", label: "Clean cut-through", sub: "Full separation, minimal char", process: "cut" },
  { key: "engrave", label: "Surface engrave", sub: "Crisp, shallow engrave", process: "engrave" },
  { key: "deep", label: "Deep / 3D engrave", sub: "Maximum depth & relief", process: "engrave" },
  { key: "photo", label: "Photo / halftone", sub: "Tonal raster image", process: "engrave" },
  { key: "mark", label: "High-contrast mark", sub: "Bold, legible marking", process: "mark" },
  { key: "color", label: "Color / anneal", sub: "MOPA color or oxide anneal", process: "mark" },
  { key: "coat", label: "Coating removal", sub: "Ablate coat to substrate", process: "mark" },
  { key: "char", label: "Minimal charring", sub: "Clean edges, no scorch", process: "cut" },
];

export function goalMeta(key: string): Goal {
  return GOALS.find((g) => g.key === key) ?? GOALS[0];
}

/** PATTERNS — id · label · sub. */
export type PatternKey = "pxs" | "interval" | "freq" | "multipass";

export interface Pattern {
  key: PatternKey;
  label: string;
  sub: string;
}

export const PATTERNS: Pattern[] = [
  { key: "pxs", label: "Power × Speed", sub: "Cut & engrave baseline" },
  { key: "interval", label: "Interval / DPI", sub: "Engrave fill quality" },
  { key: "freq", label: "Frequency / Q-Pulse", sub: "Fiber · UV · IR marking" },
  { key: "multipass", label: "Multi-pass depth", sub: "Passes × power" },
];

export function patternMeta(key: string): Pattern {
  return PATTERNS.find((p) => p.key === key) ?? PATTERNS[0];
}

/** The primary (energy) param for a type — first key in TYPE_PARAMS
 *  (power for most; qpulse for UV, which has no power %). */
export function primaryParam(type: MachineTypeKey): ParamKey {
  return TYPE_PARAMS[type][0];
}

/**
 * Axis param keys (x, y) for a pattern on a given type. Returns null when the
 * pattern isn't applicable to the type (a required axis param the type doesn't
 * expose). x is the "sweep" axis, y is the primary/energy axis.
 */
export function patternAxisKeys(type: MachineTypeKey, pattern: PatternKey): { x: ParamKey; y: ParamKey } | null {
  const has = (k: ParamKey) => TYPE_PARAMS[type].includes(k);
  const primary = primaryParam(type);
  switch (pattern) {
    case "pxs":
      return has("speed") && primary !== "speed" ? { x: "speed", y: primary } : null;
    case "interval": {
      const xk: ParamKey | null = has("interval") ? "interval" : has("dpi") ? "dpi" : null;
      return xk && xk !== primary ? { x: xk, y: primary } : null;
    }
    case "freq":
      return has("freq") && primary !== "freq" ? { x: "freq", y: primary } : null;
    case "multipass":
      return has("passes") && primary !== "passes" ? { x: "passes", y: primary } : null;
    default:
      return null;
  }
}

/** Patterns applicable to a machine type, in display order. */
export function applicablePatterns(type: MachineTypeKey): Pattern[] {
  return PATTERNS.filter((p) => patternAxisKeys(type, p.key) !== null);
}

/** A sensible default pattern for a goal on a type (first applicable of a
 *  goal-specific preference list). */
export function defaultPattern(type: MachineTypeKey, goal: GoalKey): PatternKey {
  const prefs: Record<GoalKey, PatternKey[]> = {
    cut: ["pxs", "multipass"],
    char: ["pxs", "multipass"],
    deep: ["multipass", "pxs"],
    engrave: ["pxs", "interval"],
    photo: ["interval", "pxs"],
    mark: ["freq", "pxs"],
    color: ["freq", "pxs"],
    coat: ["freq", "pxs"],
  };
  const applicable = new Set(applicablePatterns(type).map((p) => p.key));
  for (const p of prefs[goal]) if (applicable.has(p)) return p;
  return applicablePatterns(type)[0]?.key ?? "pxs";
}

/**
 * Heuristic "energy" direction per param — how a param pushes deposited energy /
 * density. Used by the placeholder grader (Phase 6 replaces it with vision).
 * +1 more energy as the value rises; -1 less; small magnitudes = weak effect.
 */
export const ENERGY_DIR: Partial<Record<ParamKey, number>> = {
  power: 1,
  qpulse: 1,
  passes: 1,
  dpi: 0.7,
  freq: 0.3,
  pulse: 0.3,
  speed: -1,
  interval: -1,
};

/** Target normalized energy per goal (0..1) — where the "sweet spot" sits. */
export const GOAL_TARGET_ENERGY: Record<GoalKey, number> = {
  cut: 0.82,
  deep: 0.88,
  char: 0.55,
  engrave: 0.45,
  photo: 0.34,
  mark: 0.62,
  color: 0.5,
  coat: 0.58,
};
