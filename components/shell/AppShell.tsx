"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CrystalMark, Wordmark } from "@/components/shell/Logo";
import { NavIcon } from "@/components/shell/NavIcons";
import { useActiveMachine } from "@/components/shell/ActiveMachineProvider";
import { MachineTypeDot } from "@/components/machines/MachineTypeChip";
import { Onboarding } from "@/components/shell/Onboarding";
import { AiStatusPill, type AiStatus } from "@/components/shell/AiStatusPill";
import { NAV_GROUPS, SCREENS } from "@/lib/nav";

export interface ShellUser {
  name: string;
  company: string;
  role: "admin" | "member";
}

function initialsOf(name: string) {
  return (
    (name || "")
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const groupLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: 9,
  letterSpacing: ".18em",
  color: "var(--sf-text-3)",
  padding: "18px 0 8px 14px",
};

export function AppShell({ user, onboarded, reviewCount = 0, ai, children }: { user: ShellUser; onboarded: boolean; reviewCount?: number; ai: AiStatus; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { mode, toggleMode } = useTheme();

  const { machines, active, setActive } = useActiveMachine();

  const [navOpen, setNavOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [switcher, setSwitcher] = useState(false);

  const isAdmin = user.role === "admin";
  const activeKey = (pathname.split("/")[1] || "dashboard") as string;
  const screen = SCREENS[activeKey] ?? SCREENS.dashboard;
  const roleLabel = isAdmin ? "Admin · Pro" : "Member · Pro";

  async function signOut() {
    await supabase.auth.signOut();
    setUserMenu(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      {navOpen && <div className="sf-backdrop" onClick={() => setNavOpen(false)} />}

      {/* ============ SIDEBAR ============ */}
      <aside
        className="sf-aside"
        data-open={navOpen ? "1" : "0"}
        style={{
          width: 244,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          background: "var(--sf-surface)",
          borderRight: "1px solid var(--sf-line)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 72, borderBottom: "1px solid var(--sf-line)" }}>
          <CrystalMark width={50} height={35} gradId="sfCrySidebar" />
          <div style={{ lineHeight: 1, minWidth: 0 }}>
            <Wordmark size={18.5} />
            <div className="font-mono" style={{ fontSize: 8, lineHeight: 1.4, letterSpacing: ".1em", color: "var(--sf-text-3)", marginTop: 6, maxWidth: 160 }}>
              TURN EXPERIMENTS
              <br />
              INTO EXPERTISE
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px 14px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((it) => !it.admin || isAdmin);
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <div style={{ ...groupLabelStyle, paddingTop: group.label === "WORKSPACE" ? 6 : 18 }}>{group.label}</div>
                {items.map((it) => {
                  const active = activeKey === it.key;
                  return (
                    <Link
                      key={it.key}
                      href={it.href}
                      onClick={() => setNavOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "9px 12px 9px 14px",
                        margin: "0 0 0 0",
                        borderRadius: "0 999px 999px 0",
                        textDecoration: "none",
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 500,
                        color: active ? "var(--sf-accent)" : "var(--sf-text-2)",
                        background: active ? "var(--sf-surface-3)" : "transparent",
                      }}
                    >
                      <NavIcon name={it.key} />
                      <span>{it.label}</span>
                      {(() => {
                        const badge = it.key === "review" ? (reviewCount > 0 ? String(reviewCount) : null) : it.badge;
                        return badge ? (
                          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "var(--sf-warn)", background: "var(--sf-warn-soft)", padding: "2px 7px", borderRadius: 999 }}>{badge}</span>
                        ) : null;
                      })()}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer: AI status + active-machine switcher + user button */}
        <div style={{ borderTop: "1px solid var(--sf-line)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <AiStatusPill ai={ai} />

          <div style={{ position: "relative" }}>
            <button
              onClick={() => machines.length && setSwitcher((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: 10, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-text)", cursor: machines.length ? "pointer" : "default", textAlign: "left" }}
              title="Active machine"
            >
              {active ? <MachineTypeDot type={active.type} /> : <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--sf-text-3)", flex: "none" }} />}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="font-mono" style={{ display: "block", fontSize: 8, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>ACTIVE MACHINE</span>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active ? active.name : "No machine yet"}</span>
              </span>
              {machines.length > 0 && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sf-text-3)" strokeWidth="1.9" style={{ flex: "none" }}><path d="M7 10l5 5 5-5" /></svg>
              )}
            </button>

            {switcher && machines.length > 0 && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line-strong)", borderRadius: 12, boxShadow: "var(--sf-e2)", padding: 6, zIndex: 20, maxHeight: 280, overflowY: "auto" }}>
                {machines.map((m) => (
                  <button key={m.id} onClick={() => { setActive(m.id); setSwitcher(false); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", textAlign: "left", color: "var(--sf-text)" }}>
                    <MachineTypeDot type={m.type} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: active?.id === m.id ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                    {active?.id === m.id && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sf-accent)" strokeWidth="2.2"><path d="M5 12l5 5 9-11" /></svg>}
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--sf-line)", margin: "5px 4px" }} />
                <Link href="/machines" onClick={() => setSwitcher(false)} style={{ display: "block", padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: "var(--sf-text-2)", textDecoration: "none" }}>Machine settings</Link>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenu((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid transparent", background: "transparent", color: "var(--sf-text)", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--sf-accent-soft)", color: "var(--sf-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flex: "none" }}>
                {initialsOf(user.name)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--sf-text-3)" }}>{roleLabel}</span>
              </span>
            </button>

            {userMenu && (
              <div
                style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line-strong)", borderRadius: 12, boxShadow: "var(--sf-e2)", padding: 6, zIndex: 20 }}
              >
                <Link href="/profile" onClick={() => setUserMenu(false)} style={menuItemStyle}>
                  Profile
                </Link>
                <Link href="/settings" onClick={() => setUserMenu(false)} style={menuItemStyle}>
                  Settings
                </Link>
                <Link href="/help" onClick={() => setUserMenu(false)} style={menuItemStyle}>
                  Help &amp; Docs
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setUserMenu(false)} style={menuItemStyle}>
                    Admin Console
                  </Link>
                )}
                <div style={{ height: 1, background: "var(--sf-line)", margin: "5px 4px" }} />
                <button onClick={signOut} style={{ ...menuItemStyle, width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--sf-danger)" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ============ MAIN COLUMN ============ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <header className="sf-header" style={{ height: 72, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--sf-line)" }}>
          <button className="sf-hamburger" onClick={() => setNavOpen(true)} aria-label="Open menu" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-text)", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div style={{ minWidth: 0 }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)" }}>{screen.kicker}</div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{screen.title}</div>
          </div>

          <div style={{ flex: 1 }} />

          <input className="sf-topsearch" placeholder="Search recipes, materials, machines…" style={{ width: 280, padding: "9px 13px", borderRadius: 10, border: "1px solid var(--sf-line-strong)", background: "var(--sf-bg)", color: "var(--sf-text)", fontSize: 13 }} />

          <button onClick={toggleMode} aria-label="Toggle theme" className="sf-tophide" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--sf-line)", background: "var(--sf-surface-2)", color: "var(--sf-text-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {mode === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></svg>
            )}
          </button>

          <Link href="/calibration" className="sf-tophide" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <NavIcon name="calibration" size={16} />
            <span className="sf-btnlabel">Calibrate</span>
          </Link>

          <Link href="/recipes" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 14px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            <span className="sf-btnlabel">New recipe</span>
          </Link>
        </header>

        <main className="sf-screen" style={{ flex: 1, overflowY: "auto", padding: "30px 32px" }}>
          {children}
        </main>
      </div>

      {/* Floating Help button */}
      <Link href="/help" aria-label="Help & Docs" title="Help & Docs" style={{ position: "fixed", bottom: 20, right: 20, width: 42, height: 42, borderRadius: 999, background: "var(--sf-accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--sf-e2)", zIndex: 30, textDecoration: "none", fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: 18 }}>?</Link>

      {!onboarded && <Onboarding />}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "9px 11px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--sf-text-2)",
  textDecoration: "none",
  textAlign: "left",
};
