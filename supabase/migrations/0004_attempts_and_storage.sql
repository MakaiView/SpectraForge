-- ─────────────────────────────────────────────────────────────────────────────
-- 0004 — Attempts + Storage buckets.
--
-- Attempts are real burns logged for the record; they refine recipes. Photos
-- live in private Storage buckets (BUILD_SPEC §4) — the DB stores object PATHS,
-- never bytes. Buckets are owner-scoped by a path convention: every object key
-- starts with the owner's uid folder ({uid}/…), enforced by RLS on
-- storage.objects.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.attempt_outcome as enum ('clean', 'marginal', 'fail');

create table public.attempts (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at         timestamptz not null default now(),
  material_id       uuid references public.materials (id) on delete set null,
  material_name     text not null default '',
  process           public.recipe_process not null default 'cut',
  machine_id        uuid references public.machines (id) on delete set null,
  recipe_id         uuid references public.recipes (id) on delete set null,  -- attempts refine a recipe
  outcome           public.attempt_outcome not null default 'clean',
  params            jsonb not null default '{}'::jsonb,   -- type-aware, keyed by param key
  addons            text[] not null default '{}',
  note              text not null default '',
  -- Storage object paths (never bytes). Full + thumbnail per photo.
  input_path        text,
  input_thumb_path  text,
  result_path       text,
  result_thumb_path text,
  created_at        timestamptz not null default now()
);

create index on public.attempts (owner_id, logged_at desc);
create index on public.attempts (machine_id);
create index on public.attempts (recipe_id);

alter table public.attempts enable row level security;
create policy "attempts_owner_all" on public.attempts
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── Storage buckets (all private) ────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('attempt-photos', 'attempt-photos', false),
  ('material-photos', 'material-photos', false),
  ('recipe-photos', 'recipe-photos', false),
  ('calibration-photos', 'calibration-photos', false),
  ('share-cards', 'share-cards', false)
on conflict (id) do nothing;

-- ── Storage RLS: owner-scoped by the first path segment ({uid}/…) ────────────
-- Applies to all SpectraForge buckets. Objects are only reachable/writable by
-- the user whose uid prefixes the key. SELECT/DELETE use USING; INSERT uses
-- WITH CHECK; UPDATE needs both.
create policy "sf_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('attempt-photos','material-photos','recipe-photos','calibration-photos','share-cards')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sf_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('attempt-photos','material-photos','recipe-photos','calibration-photos','share-cards')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sf_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('attempt-photos','material-photos','recipe-photos','calibration-photos','share-cards')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sf_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('attempt-photos','material-photos','recipe-photos','calibration-photos','share-cards')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('attempt-photos','material-photos','recipe-photos','calibration-photos','share-cards')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
