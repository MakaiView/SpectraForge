import { SCREENS } from "@/lib/nav";

/**
 * Stub screen for sections whose data layer lands in a later phase. Renders the
 * screen's real kicker/title/description so the shell feels complete while the
 * feature is pending.
 */
export function Placeholder({ screen }: { screen: keyof typeof SCREENS }) {
  const meta = SCREENS[screen];
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 8px" }}>
        {meta.title}
      </h1>
      {meta.desc && <p style={{ fontSize: 14, color: "var(--sf-text-2)", maxWidth: 640, margin: "0 0 24px" }}>{meta.desc}</p>}
      <div
        style={{
          border: "1px dashed var(--sf-line-strong)",
          borderRadius: 14,
          padding: "40px 28px",
          background: "var(--sf-surface)",
          color: "var(--sf-text-3)",
          fontSize: 13.5,
          textAlign: "center",
        }}
      >
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>
          COMING IN A LATER PHASE
        </span>
        <p style={{ margin: "10px 0 0" }}>
          The shell, auth, roles and RLS are live. This screen&apos;s data layer is built in a subsequent phase (see BUILD_SPEC §7).
        </p>
      </div>
    </div>
  );
}
