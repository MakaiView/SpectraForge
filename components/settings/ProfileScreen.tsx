"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { saveProfile } from "@/app/(app)/settings/actions";

const card: React.CSSProperties = { background: "var(--sf-surface)", border: "1px solid var(--sf-line)", borderRadius: 14, boxShadow: "var(--sf-e1)" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "var(--sf-bg)", border: "1px solid var(--sf-line-strong)", borderRadius: 10, color: "var(--sf-text)", fontSize: 14 };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 6px" };

function initialsOf(name: string) {
  return (name || "").trim().split(/\s+/).map((w) => w[0] || "").slice(0, 2).join("").toUpperCase() || "?";
}

export function ProfileScreen({ name: initialName, company: initialCompany, email, role }: { name: string; company: string; email: string; role: "admin" | "member" }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError(""); setMsg("");
    const res = await saveProfile(name, company);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMsg("Saved ✓");
    setTimeout(() => setMsg(""), 1600);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 20px" }}>Profile</h1>

      <div style={{ ...card, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <span style={{ width: 56, height: 56, borderRadius: 999, background: "var(--sf-accent-soft)", color: "var(--sf-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flex: "none" }}>{initialsOf(name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{name || email}</div>
            <div style={{ fontSize: 13, color: "var(--sf-text-3)", marginTop: 2 }}>{email}</div>
          </div>
          <Badge tone={role === "admin" ? "accent" : "muted"}>{role === "admin" ? "Admin · Pro" : "Member · Pro"}</Badge>
        </div>

        <label style={label}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, marginBottom: 14 }} />
        <label style={label}>Company / studio</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="ForgeWorks Studio" style={{ ...input, marginBottom: 6 }} />
        <div style={{ fontSize: 12, color: "var(--sf-text-3)", marginBottom: 18 }}>Email and password changes go through your account provider.</div>

        {error && <div style={{ marginBottom: 12, padding: "9px 11px", background: "var(--sf-danger-soft)", border: "1px solid var(--sf-danger)", borderRadius: 9, color: "var(--sf-danger)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={save} disabled={busy} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{busy ? "Saving…" : "Save changes"}</button>
          {msg && <span style={{ fontSize: 12.5, color: "var(--sf-success)", fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
