"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, fieldInput, FormError } from "@/components/ui/Modal";
import { addCategory, deleteCategory } from "@/app/(app)/materials/actions";
import type { Category } from "@/components/materials/MaterialForm";

/**
 * Manage the user's material-category list (feeds the material dropdown).
 * README places this under Settings → Material Categories; surfaced here from
 * Materials until the Settings screen lands (Phase 7).
 */
export function CategoryManager({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const res = await addCategory(name);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await deleteCategory(id);
    if (res.ok) router.refresh();
  }

  return (
    <Modal onClose={onClose} title="Material categories" maxWidth={440}>
      <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: "0 0 14px" }}>
        This managed list feeds the category dropdown. Removing a category leaves its materials uncategorized.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Add a category…"
          style={{ ...fieldInput, flex: 1 }}
        />
        <button onClick={add} disabled={busy} style={{ height: 40, padding: "0 15px", borderRadius: 10, border: "none", background: "var(--sf-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", flex: "none" }}>Add</button>
      </div>

      <FormError message={error} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4, maxHeight: 260, overflowY: "auto" }}>
        {categories.map((c) => (
          <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 8px 6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 500, background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", color: "var(--sf-text-2)" }}>
            {c.name}
            <button onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} style={{ width: 18, height: 18, borderRadius: 999, border: "none", background: "var(--sf-surface-3)", color: "var(--sf-text-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        ))}
      </div>
    </Modal>
  );
}
