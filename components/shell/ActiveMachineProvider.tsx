"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface ActiveMachineOption {
  id: string;
  name: string;
  type: MachineTypeKey;
}

interface ActiveMachineContextValue {
  machines: ActiveMachineOption[];
  activeId: string | null;
  active: ActiveMachineOption | null;
  setActive: (id: string) => void;
}

const Ctx = createContext<ActiveMachineContextValue | null>(null);

const KEY = "sf_active_machine";

/**
 * Holds the workshop's "active machine" — the context used to prefill new
 * recipes/attempts and to derive calibration grid axes (README §Machine
 * context). Persisted in localStorage; defaults to the first machine.
 */
export function ActiveMachineProvider({ machines, children }: { machines: ActiveMachineOption[]; children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    const valid = saved && machines.some((m) => m.id === saved) ? saved : machines[0]?.id ?? null;
    setActiveId(valid);
  }, [machines]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(KEY, id);
  }, []);

  const value = useMemo<ActiveMachineContextValue>(
    () => ({ machines, activeId, active: machines.find((m) => m.id === activeId) ?? null, setActive }),
    [machines, activeId, setActive]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveMachine(): ActiveMachineContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useActiveMachine must be used within ActiveMachineProvider");
  return ctx;
}
