import { getProfile } from "@/lib/auth/session";

export const metadata = { title: "Dashboard · SpectraForge" };

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const profile = await getProfile();
  const firstName = (profile?.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>
        {greeting()}, {firstName}
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--sf-text-2)", margin: "0 0 28px" }}>
        Turn experiments into expertise — document what works, calibrate what doesn&apos;t.
      </p>

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
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: ".16em" }}>PHASE 1 · AUTH + SHELL LIVE</span>
        <p style={{ margin: "10px 0 0" }}>
          Metrics, recent activity and the AI guidance panel wire to real aggregates once the data layer lands (BUILD_SPEC §7.2).
        </p>
      </div>
    </div>
  );
}
