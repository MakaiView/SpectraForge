-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 — Calibration Lab: runs + tests.
--
-- A CalibrationRun is a saved, resumable dial-in session for a material on a
-- machine. It owns an ordered list of CalibrationTests (the adaptive
-- Setup · Test 1 · … · Promote stepper). Each test stores its axes/grid/grades
-- + sheet photo — which is also the labeled training data for the future vision
-- grader (BUILD_SPEC §5d, the data flywheel). Owner-scoped by RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.calibration_status as enum ('in-progress', 'promoted');

create table public.calibration_runs (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null default '',
  material_id        uuid references public.materials (id) on delete set null,
  material_name      text not null default '',
  machine_id         uuid references public.machines (id) on delete set null,
  goal               text not null,                       -- GOALS key
  baseline           jsonb,                               -- optional MachineBaseline/preset the first grid centers on
  status             public.calibration_status not null default 'in-progress',
  promoted_recipe_id uuid references public.recipes (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.calibration_tests (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_id             uuid not null references public.calibration_runs (id) on delete cascade,
  idx                integer not null,                    -- Test 1, 2, …
  pattern            text not null,                       -- PATTERNS key
  axes               jsonb not null default '{}'::jsonb,  -- { x:{key,values[]}, y:{key,values[]} }
  statics            jsonb not null default '{}'::jsonb,  -- fixed params not on either axis
  grid               jsonb not null default '{}'::jsonb,  -- "row,col" → grade
  best_square        jsonb,                               -- { row, col, params }
  analysis           jsonb,                               -- { headline, writeup }
  photo_path         text,                                -- burned-sheet photo (Storage ref)
  photo_thumb_path   text,
  created_at         timestamptz not null default now(),
  unique (run_id, idx)
);

create index on public.calibration_runs (owner_id, updated_at desc);
create index on public.calibration_tests (run_id, idx);

alter table public.calibration_runs enable row level security;
alter table public.calibration_tests enable row level security;

create policy "calibration_runs_owner_all" on public.calibration_runs
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "calibration_tests_owner_all" on public.calibration_tests
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Now that calibration_runs exists, wire the recipe provenance FK (the column
-- was created bare in migration 0003 pending this table).
alter table public.recipes
  add constraint recipes_cal_run_id_fkey
  foreign key (cal_run_id) references public.calibration_runs (id) on delete set null;
