"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  company: string;
  active: boolean;
  created_at: string;
}

interface ModalState {
  mode: "create" | "edit";
  id: string | null;
  name: string;
  email: string;
  company: string;
  password: string;
  role: "admin" | "member";
  active: boolean;
}

function initialsOf(name: string) {
  return (
    (name || "").trim().split(/\s+/).map((w) => w[0] || "").slice(0, 2).join("").toUpperCase() || "?"
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--sf-surface)",
  border: "1px solid var(--sf-line)",
  borderRadius: 14,
  boxShadow: "var(--sf-e1)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  background: "var(--sf-bg)",
  border: "1px solid var(--sf-line-strong)",
  borderRadius: 10,
  color: "var(--sf-text)",
  fontSize: 14,
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--sf-text-2)", margin: "0 0 6px" };

function Badge({ tone, children }: { tone: "accent" | "muted" | "success" | "danger"; children: React.ReactNode }) {
  const map = {
    accent: { c: "var(--sf-accent)", b: "var(--sf-accent-soft)" },
    muted: { c: "var(--sf-text-3)", b: "var(--sf-surface-3)" },
    success: { c: "var(--sf-success)", b: "var(--sf-success-soft)" },
    danger: { c: "var(--sf-danger)", b: "var(--sf-danger-soft)" },
  }[tone];
  return (
    <span className="font-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", color: map.c, background: map.b, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

export function AdminConsole({
  currentUserId,
  initialUsers,
  registrationOpen,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
  registrationOpen: boolean;
}) {
  const router = useRouter();
  const [regOpen, setRegOpen] = useState(registrationOpen);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);

  const users = initialUsers;
  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  async function toggleReg() {
    const next = !regOpen;
    setRegOpen(next);
    const res = await fetch("/api/admin/registration", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: next }),
    });
    if (!res.ok) setRegOpen(!next); // revert on failure
    else router.refresh();
  }

  function openCreate() {
    setModalError("");
    setModal({ mode: "create", id: null, name: "", email: "", company: "", password: "", role: "member", active: true });
  }
  function openEdit(u: AdminUser) {
    setModalError("");
    setModal({ mode: "edit", id: u.id, name: u.name, email: u.email, company: u.company, password: "", role: u.role, active: u.active });
  }

  async function saveUser() {
    if (!modal) return;
    setBusy(true);
    setModalError("");
    const url = modal.mode === "create" ? "/api/admin/users" : `/api/admin/users/${modal.id}`;
    const method = modal.mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modal),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setModalError(b.error || "Could not save the user.");
    setModal(null);
    router.refresh();
  }

  async function deleteUser(id: string) {
    if (id === currentUserId) return;
    if (!confirm("Delete this account? This can't be undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Admin Console</h1>
      <p style={{ fontSize: 14, color: "var(--sf-text-2)", margin: "0 0 24px" }}>Manage user accounts, roles and registration access for your SpectraForge workspace.</p>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { label: "TOTAL USERS", value: stats.total },
          { label: "ACTIVE", value: stats.active },
          { label: "ADMINS", value: stats.admins },
        ].map((s) => (
          <div key={s.label} style={{ ...cardStyle, flex: "1 1 160px", padding: "16px 18px" }}>
            <div className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>{s.label}</div>
            <div className="font-display" style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Registration toggle */}
      <div style={{ ...cardStyle, padding: "18px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Open registration</div>
          <div style={{ fontSize: 12.5, color: "var(--sf-text-3)", marginTop: 3 }}>
            When off, sign-up is rejected and the login gate reads &ldquo;by invitation only&rdquo;. Off by default.
          </div>
        </div>
        <button
          onClick={toggleReg}
          role="switch"
          aria-checked={regOpen}
          style={{ width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: regOpen ? "var(--sf-accent)" : "var(--sf-surface-3)", position: "relative", flex: "none" }}
        >
          <span style={{ position: "absolute", top: 3, left: regOpen ? 23 : 3, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left .15s ease" }} />
        </button>
      </div>

      {/* Users table */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--sf-line)" }}>
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>User accounts</div>
          <button onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 13px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Create user
          </button>
        </div>

        {users.map((u) => {
          const self = u.id === currentUserId;
          return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--sf-line)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: "var(--sf-accent-soft)", color: "var(--sf-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flex: "none", opacity: u.active ? 1 : 0.45 }}>
                {initialsOf(u.name)}
              </span>
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                  {self && <Badge tone="accent">You</Badge>}
                </div>
                <div style={{ fontSize: 12, color: "var(--sf-text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
              </div>
              <div style={{ flex: "none" }}>{u.role === "admin" ? <Badge tone="accent">Admin</Badge> : <Badge tone="muted">Member</Badge>}</div>
              <div style={{ flex: "none", width: 92, textAlign: "left" }}>{u.active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</div>
              <div style={{ flex: "none", display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(u)} aria-label="Edit" style={iconBtn}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </button>
                {!self && (
                  <button onClick={() => deleteUser(u.id)} aria-label="Delete" style={{ ...iconBtn, color: "var(--sf-danger)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / edit modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(6,9,14,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} className="sf-modal" style={{ ...cardStyle, boxShadow: "var(--sf-e2)", width: "100%", maxWidth: 460, padding: "22px 22px 20px" }}>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>{modal.mode === "create" ? "Create user" : "Edit user"}</h2>

            <label style={labelStyle}>Name</label>
            <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>Email</label>
            <input value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} type="email" style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>Company <span style={{ color: "var(--sf-text-3)", fontWeight: 400 }}>(optional)</span></label>
            <input value={modal.company} onChange={(e) => setModal({ ...modal, company: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>{modal.mode === "create" ? "Initial password" : "Reset password (optional)"}</label>
            <input value={modal.password} onChange={(e) => setModal({ ...modal, password: e.target.value })} type="password" placeholder={modal.mode === "create" ? "At least 4 characters" : "Leave blank to keep current"} autoComplete="new-password" style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Role</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {(["member", "admin"] as const).map((r) => (
                <button key={r} onClick={() => setModal({ ...modal, role: r })} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid var(--sf-line-strong)", cursor: "pointer", textTransform: "capitalize", fontSize: 13, fontWeight: 600, background: modal.role === r ? "var(--sf-accent-soft)" : "var(--sf-bg)", color: modal.role === r ? "var(--sf-accent)" : "var(--sf-text-2)", borderColor: modal.role === r ? "var(--sf-accent)" : "var(--sf-line-strong)" }}>
                  {r}
                </button>
              ))}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 4 }}>
              <button
                onClick={() => setModal({ ...modal, active: !modal.active })}
                role="switch"
                aria-checked={modal.active}
                type="button"
                style={{ width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: modal.active ? "var(--sf-accent)" : "var(--sf-surface-3)", position: "relative", flex: "none" }}
              >
                <span style={{ position: "absolute", top: 3, left: modal.active ? 21 : 3, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .15s ease" }} />
              </button>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Account active</span>
            </label>

            {modalError && (
              <div style={{ marginTop: 12, padding: "9px 11px", background: "var(--sf-danger-soft)", border: "1px solid var(--sf-danger)", borderRadius: 9, color: "var(--sf-danger)", fontSize: 12.5, fontWeight: 500 }}>{modalError}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={{ height: 38, padding: "0 15px", borderRadius: 9, border: "1px solid var(--sf-line-strong)", background: "var(--sf-surface-2)", color: "var(--sf-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveUser} disabled={busy} style={{ height: 38, padding: "0 17px", borderRadius: 9, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Saving…" : modal.mode === "create" ? "Create user" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--sf-line)",
  background: "var(--sf-surface-2)",
  color: "var(--sf-text-2)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
