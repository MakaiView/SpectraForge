import { FORGE_ORANGE } from "@/lib/theme/palette";

/**
 * The faceted-crystal + spectrum-fan mark (chosen logo "2a") + wordmark.
 * SVG lifted verbatim from the prototype. `gradId` must be unique per instance
 * since multiple logos (auth gate + sidebar) can render on one page.
 */
export function CrystalMark({
  width = 50,
  height = 35,
  gradId = "sfCry",
}: {
  width?: number;
  height?: number;
  gradId?: string;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 64 64" fill="none" style={{ flex: "none" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8edf5" />
          <stop offset=".5" stopColor="#aab6c6" />
          <stop offset="1" stopColor="#6c7989" />
        </linearGradient>
      </defs>
      <line x1="2" y1="32" x2="20" y2="32" stroke="var(--sf-text)" strokeWidth="2.6" strokeLinecap="round" />
      <polygon points="22,12 38,32 22,52 8,32" fill={`url(#${gradId})`} stroke="#eef2f8" strokeWidth="1" />
      <line x1="22" y1="12" x2="22" y2="52" stroke="#8090a4" strokeWidth="1" />
      <g strokeWidth="3.4" strokeLinecap="round">
        <line x1="36" y1="30.5" x2="60" y2="14" stroke="#8b5cf6" />
        <line x1="37" y1="31.5" x2="62" y2="23" stroke="#3b82f6" />
        <line x1="38" y1="32" x2="63" y2="32" stroke="#22b8e6" />
        <line x1="37" y1="32.5" x2="62" y2="41" stroke="#5bc94a" />
        <line x1="36" y1="33.5" x2="60" y2="50" stroke="#ef4444" />
      </g>
    </svg>
  );
}

/** "SpectraForge" wordmark — Spectra in text color, Forge in brand orange. */
export function Wordmark({ size = 18.5 }: { size?: number }) {
  return (
    <span
      className="font-display font-bold"
      style={{ fontSize: size, letterSpacing: "-.01em", lineHeight: 1 }}
    >
      <span style={{ color: "var(--sf-text)" }}>Spectra</span>
      <span style={{ color: FORGE_ORANGE }}>Forge</span>
    </span>
  );
}

/** Full lockup: crystal + wordmark + micro-tagline. Used in sidebar + gate. */
export function LogoLockup({
  wordmarkSize = 18.5,
  crystalW = 50,
  crystalH = 35,
  gradId = "sfCry",
  taglineSize = 8,
  centered = false,
}: {
  wordmarkSize?: number;
  crystalW?: number;
  crystalH?: number;
  gradId?: string;
  taglineSize?: number;
  centered?: boolean;
}) {
  return (
    <div className="flex items-center gap-3" style={{ justifyContent: centered ? "center" : undefined }}>
      <CrystalMark width={crystalW} height={crystalH} gradId={gradId} />
      <div style={{ lineHeight: 1, minWidth: 0 }}>
        <Wordmark size={wordmarkSize} />
        <div
          className="font-mono"
          style={{
            fontSize: taglineSize,
            lineHeight: 1.4,
            letterSpacing: ".1em",
            color: "var(--sf-text-3)",
            marginTop: 6,
            maxWidth: 160,
          }}
        >
          TURN EXPERIMENTS
          <br />
          INTO EXPERTISE
        </div>
      </div>
    </div>
  );
}
