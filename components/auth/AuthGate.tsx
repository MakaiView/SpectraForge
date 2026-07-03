"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/shell/Logo";

type View = "login" | "register";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  background: "var(--sf-bg)",
  border: "1px solid var(--sf-line-strong)",
  borderRadius: 10,
  color: "var(--sf-text)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--sf-text-2)",
  marginBottom: 6,
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 14,
        padding: "10px 12px",
        background: "var(--sf-danger-soft)",
        border: "1px solid var(--sf-danger)",
        borderRadius: 9,
        color: "var(--sf-danger)",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: "none" }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function AuthGate({ registrationOpen }: { registrationOpen: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const year = new Date().getFullYear();

  async function doLogin() {
    setBusy(true);
    setError("");
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    if (signInError || !data.user) {
      setBusy(false);
      return setError("Incorrect email or password.");
    }
    // Our own `active` flag gates login even when credentials are valid.
    const { data: profile } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", data.user.id)
      .single();
    if (!profile?.active) {
      await supabase.auth.signOut();
      setBusy(false);
      return setError("This account has been deactivated. Contact your administrator.");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function doRegister() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email.trim(), company, password: pw }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.error || "Could not create your account.");
    }
    // Auto-login on success (matches the prototype).
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    if (signInError) {
      setBusy(false);
      return setError("Account created, but sign-in failed. Try signing in.");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  function switchView(v: View) {
    setView(v);
    setError("");
    setPw("");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "var(--sf-bg)",
        backgroundImage:
          "radial-gradient(circle at 22% 18%, var(--sf-accent-soft), transparent 42%), linear-gradient(var(--sf-grid) 1px,transparent 1px), linear-gradient(90deg,var(--sf-grid) 1px,transparent 1px)",
        backgroundSize: "auto, 46px 46px, 46px 46px",
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, margin: "auto" }}>
        <div style={{ marginBottom: 26 }}>
          <LogoLockup wordmarkSize={24} crystalW={52} crystalH={37} gradId="sfCryAuth" taglineSize={8.5} centered />
        </div>

        <div
          style={{
            background: "var(--sf-surface)",
            border: "1px solid var(--sf-line)",
            borderRadius: 16,
            boxShadow: "var(--sf-e2)",
            padding: "28px 26px",
          }}
        >
          {view === "login" ? (
            <>
              <h1 className="font-display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.015em", margin: "0 0 4px" }}>
                Sign in
              </h1>
              <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "0 0 22px" }}>Welcome back to your bench brain.</p>

              <label style={labelStyle}>Email</label>
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                type="email"
                placeholder="you@studio.com"
                autoComplete="username"
                style={{ ...inputStyle, marginBottom: 15 }}
              />
              <label style={labelStyle}>Password</label>
              <input
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !busy) doLogin(); }}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle}
              />
              {error && <ErrorBanner message={error} />}
              <button
                onClick={doLogin}
                disabled={busy}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: 12,
                  border: "none",
                  borderRadius: 10,
                  background: "var(--sf-accent)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy ? "default" : "pointer",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>

              {registrationOpen ? (
                <p style={{ textAlign: "center", fontSize: 13, color: "var(--sf-text-2)", margin: "18px 0 0" }}>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => switchView("register")} style={{ border: "none", background: "none", color: "var(--sf-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                    Create one
                  </button>
                </p>
              ) : (
                <p style={{ textAlign: "center", fontSize: 12, color: "var(--sf-text-3)", margin: "18px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Registration is by invitation only
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="font-display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.015em", margin: "0 0 4px" }}>
                Create your account
              </h1>
              <p style={{ fontSize: 13.5, color: "var(--sf-text-2)", margin: "0 0 22px" }}>Start documenting what works.</p>

              <label style={labelStyle}>Name</label>
              <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Your name" style={{ ...inputStyle, marginBottom: 14 }} />
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} type="email" placeholder="you@studio.com" style={{ ...inputStyle, marginBottom: 14 }} />
              <label style={labelStyle}>
                Workspace / company <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input value={company} onChange={(e) => { setCompany(e.target.value); setError(""); }} placeholder="ForgeWorks Studio" style={{ ...inputStyle, marginBottom: 14 }} />
              <label style={labelStyle}>Password</label>
              <input value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} type="password" placeholder="At least 4 characters" autoComplete="new-password" style={inputStyle} />
              {error && <ErrorBanner message={error} />}
              <button
                onClick={doRegister}
                disabled={busy}
                style={{ width: "100%", marginTop: 20, padding: 12, border: "none", borderRadius: 10, background: "var(--sf-accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}
              >
                {busy ? "Creating…" : "Create account"}
              </button>
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--sf-text-2)", margin: "18px 0 0" }}>
                Already have an account?{" "}
                <button onClick={() => switchView("login")} style={{ border: "none", background: "none", color: "var(--sf-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>

        <p className="font-mono" style={{ textAlign: "center", fontSize: 10, letterSpacing: ".06em", color: "var(--sf-text-3)", margin: "20px 0 0" }}>
          © {year} Makai View Media, LLC
        </p>
      </div>
    </div>
  );
}
