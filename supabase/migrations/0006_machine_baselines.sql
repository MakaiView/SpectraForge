-- ─────────────────────────────────────────────────────────────────────────────
-- 0006 — MachineBaseline / preset records (BUILD_SPEC §6, DATA_MODEL).
--
-- Owner-provided starting settings used as calibration baselines + AI grounding.
-- Keyed by machine (or bare machine type) + lens/module + material + process,
-- holding starting parameter values within that machine's ranges. Numbers are
-- owner-supplied (from the manufacturer PDFs in seed/manufacturer-presets/) —
-- never invented. Fed via a paste/upload import path.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.machine_baselines (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  machine_id    uuid references public.machines (id) on delete set null,   -- optional link to an owned machine
  machine_type  public.machine_type not null,                              -- typed even without a machine row
  lens          text not null default '',                                  -- lens/module identity (70mm, 150mm, 2W, 10W…)
  material_id   uuid references public.materials (id) on delete set null,
  material_name text not null default '',                                  -- free descriptor when no material row
  process       public.recipe_process not null default 'cut',
  params        jsonb not null default '{}'::jsonb,                        -- starting values keyed by param key
  source        text not null default 'manufacturer',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create index on public.machine_baselines (owner_id);
create index on public.machine_baselines (machine_id);
create index on public.machine_baselines (owner_id, machine_type, material_name);

alter table public.machine_baselines enable row level security;
create policy "machine_baselines_owner_all" on public.machine_baselines
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
