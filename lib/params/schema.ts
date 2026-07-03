/**
 * The parameter-schema backbone (DATA_MODEL "The backbone").
 *
 * Everything — machine ranges, recipe/attempt params, calibration axes, grading —
 * is driven by these lookup tables. Model them as constants/config, never as
 * per-row data. RULE: anywhere parameters are shown, entered, or graded, iterate
 * the machine type's TYPE_PARAMS list — never a fixed set.
 *
 * Canonical param keys follow DATA_MODEL's PARAM_DEFS (power/speed/passes/…).
 * The prototype's seed data uses abbreviations (pwr/spd/pass); map those only
 * when lifting seed values.
 */

export type ParamKey =
  | "power"
  | "speed"
  | "freq"
  | "qpulse"
  | "pulse"
  | "interval"
  | "dpi"
  | "passes";

export type ParamKind = "range" | "count";

export interface ParamDef {
  key: ParamKey;
  label: string;
  short: string;
  unit: string;
  kind: ParamKind;
  /** decimals shown in readouts (DATA_MODEL: interval → 3, others → 0) */
  decimals: number;
}

export const PARAM_DEFS: Record<ParamKey, ParamDef> = {
  power: { key: "power", label: "Power", short: "PWR", unit: "%", kind: "range", decimals: 0 },
  speed: { key: "speed", label: "Speed", short: "SPD", unit: "mm/s", kind: "range", decimals: 0 },
  freq: { key: "freq", label: "Frequency", short: "FREQ", unit: "kHz", kind: "range", decimals: 0 },
  qpulse: { key: "qpulse", label: "Q-Pulse", short: "QPLS", unit: "ns", kind: "range", decimals: 0 },
  pulse: { key: "pulse", label: "Pulse width", short: "PULSE", unit: "ns", kind: "range", decimals: 0 },
  interval: { key: "interval", label: "Interval", short: "INT", unit: "mm", kind: "range", decimals: 3 },
  dpi: { key: "dpi", label: "Resolution", short: "DPI", unit: "dpi", kind: "range", decimals: 0 },
  passes: { key: "passes", label: "Passes", short: "PASS", unit: "", kind: "count", decimals: 0 },
};

export type MachineTypeKey = "co2" | "fiber" | "diode" | "uv" | "ir";

export interface MachineTypeDef {
  key: MachineTypeKey;
  label: string;
  sub: string;
  accent: string;
}

/** DATA_MODEL MACHINE_TYPES — label, sub, accent color. */
export const MACHINE_TYPES: Record<MachineTypeKey, MachineTypeDef> = {
  co2: { key: "co2", label: "CO₂", sub: "Gas tube · galvo-free", accent: "#f3934f" },
  fiber: { key: "fiber", label: "Fiber", sub: "Galvo · metal marking", accent: "#3f97ff" },
  diode: { key: "diode", label: "Diode", sub: "Solid-state · entry", accent: "#3dd68c" },
  uv: { key: "uv", label: "UV", sub: "Cold marking · 355nm", accent: "#a672f6" },
  ir: { key: "ir", label: "IR-MOPA", sub: "Pulsed fiber · color marking", accent: "#f2647e" },
};

/**
 * TYPE_PARAMS — which params each laser type exposes, in display order.
 * NOTE: uv has NO power % (it leads with qpulse). Enforce type-aware params
 * everywhere (BUILD_SPEC §8).
 */
export const TYPE_PARAMS: Record<MachineTypeKey, ParamKey[]> = {
  co2: ["power", "speed", "passes", "dpi"],
  diode: ["power", "speed", "passes", "dpi"],
  fiber: ["power", "speed", "freq", "passes"],
  ir: ["power", "speed", "freq", "pulse", "passes"],
  uv: ["qpulse", "speed", "freq", "interval", "passes"],
};

/** ADDONS — accessory id · label (DATA_MODEL). */
export const ADDONS: { id: string; label: string }[] = [
  { id: "airAssist", label: "Air Assist" },
  { id: "rollerRotary", label: "Roller Rotary" },
  { id: "chuckRotary", label: "Chuck Rotary" },
  { id: "honeycomb", label: "Honeycomb Bed" },
  { id: "passthrough", label: "Pass-through" },
  { id: "camera", label: "Camera / Lid" },
  { id: "autofocus", label: "Auto-focus" },
  { id: "fume", label: "Fume Extractor" },
];

/** Params exposed by a machine type, resolved to their full defs. */
export function paramsForType(type: MachineTypeKey): ParamDef[] {
  return TYPE_PARAMS[type].map((k) => PARAM_DEFS[k]);
}

/** Format a raw param value using its def's unit + decimals. */
export function formatParam(key: ParamKey, value: number): string {
  const def = PARAM_DEFS[key];
  const n = value.toFixed(def.decimals);
  return def.unit ? `${n} ${def.unit}` : n;
}
