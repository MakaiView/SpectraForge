import { MACHINE_TYPES, type MachineTypeKey } from "@/lib/params/schema";

/** The machine identity fields worth handing the model (make/power/lens). */
export interface MachineInfo {
  type: MachineTypeKey;
  name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  watts?: number | null;
  lens?: string | null;
}

/**
 * One-line, human-readable machine description for AI prompts (BUILD_SPEC §5).
 * A general model reasons far better about starting settings / grading when it
 * knows the actual laser — not just "uv" but "ComMarker Omni XE — UV (355 nm),
 * 6 W, 70mm lens". Built from the machines row; empty fields are omitted.
 */
export function machineContext(m: MachineInfo): string {
  const identity = [m.manufacturer, m.model].filter(Boolean).join(" ").trim() || (m.name ?? "").trim();
  const typeLabel = MACHINE_TYPES[m.type]?.label ?? m.type;
  const specs = [
    typeLabel === "UV" ? "UV (355 nm)" : typeLabel,
    m.watts && m.watts > 0 ? `${m.watts} W` : null,
    m.lens ? `${m.lens} lens/module` : null,
  ]
    .filter(Boolean)
    .join(", ");
  if (identity && specs) return `${identity} — ${specs} laser`;
  return specs ? `${specs} laser` : identity || m.type;
}
