"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormError, ModalButtons } from "@/components/ui/Modal";
import { CalibrationGrid } from "@/components/calibration/CalibrationGrid";
import { resolveCell, type BestSquare } from "@/lib/calibration/engine";
import { TYPE_PARAMS, PARAM_DEFS, formatParam } from "@/lib/params/schema";
import { promoteRun } from "@/app/(app)/calibration/actions";
import type { WizardTest } from "@/components/calibration/RunWizard";

export function PromoteModal({ runId, test, goalLabel, onClose }: { runId: string; test: WizardTest; goalLabel: string; onClose: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ row: number; col: number }>(test.best ? { row: test.best.row, col: test.best.col } : { row: 0, col: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const params = resolveCell(test.axes, test.statics, selected.row, selected.col);
  const selectedBest: BestSquare = { row: selected.row, col: selected.col, params };
  const keys = Object.keys(params).filter((k) => TYPE_PARAMS && k in PARAM_DEFS);

  async function promote() {
    setSaving(true);
    setError("");
    const res = await promoteRun(runId, test.id, selected.row, selected.col);
    if (!res.ok) { setSaving(false); return setError(res.error); }
    router.push(`/recipes/${res.data!.recipeId}`);
  }

  return (
    <Modal onClose={onClose} title="Promote to recipe" maxWidth={560} footer={<ModalButtons onCancel={onClose} onSave={promote} saving={saving} saveLabel="Create recipe" />}>
      <p style={{ fontSize: 13, color: "var(--sf-text-2)", margin: "0 0 16px" }}>Pick the winning square — it prefills a <strong>{goalLabel}</strong> recipe with these parameters and stamps provenance back to this run.</p>

      <CalibrationGrid axes={test.axes} grid={test.grid} best={selectedBest} editable onCellClick={(row, col) => setSelected({ row, col })} />

      <div className="font-mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--sf-text-3)", margin: "18px 0 10px" }}>RESULTING PARAMETERS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {keys.map((k) => (
          <div key={k} style={{ background: "var(--sf-surface-2)", border: "1px solid var(--sf-line)", borderRadius: 9, padding: "8px 12px" }}>
            <span className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--sf-text-3)" }}>{PARAM_DEFS[k as keyof typeof PARAM_DEFS].short}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, marginLeft: 8 }}>{formatParam(k as keyof typeof PARAM_DEFS, params[k])}</span>
          </div>
        ))}
      </div>

      <FormError message={error} />
    </Modal>
  );
}
