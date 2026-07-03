import { MACHINE_TYPES, type MachineTypeKey } from "@/lib/params/schema";

/** Color-coded laser-type chip (CO₂/Fiber/Diode/UV/IR-MOPA). */
export function MachineTypeChip({ type, size = "md" }: { type: MachineTypeKey; size?: "sm" | "md" }) {
  const t = MACHINE_TYPES[type];
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 9.5 : 10.5;
  return (
    <span
      className="font-mono"
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: fs, fontWeight: 600, letterSpacing: ".06em", color: t.accent, background: `${t.accent}22`, padding: pad, borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.accent }} />
      {t.label}
    </span>
  );
}

/** Just the colored dot (for the active-machine switcher). */
export function MachineTypeDot({ type, size = 8 }: { type: MachineTypeKey; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 999, background: MACHINE_TYPES[type].accent, flex: "none" }} />;
}
