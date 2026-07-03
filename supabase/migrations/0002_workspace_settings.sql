-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 — Workspace settings (single row).
--
-- `registration_open` gates public sign-up. DEFAULT FALSE — registration ships
-- closed (BUILD_SPEC §3a "intended initial state"). The sign-up route MUST
-- reject when false server-side; hiding the link is not enough. Toggled only
-- from the Admin Console.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.workspace_settings (
  id                integer primary key default 1,
  registration_open boolean not null default false,
  updated_at        timestamptz not null default now(),
  constraint workspace_settings_singleton check (id = 1)
);

comment on table public.workspace_settings is 'Singleton row (id=1). registration_open gates sign-up (BUILD_SPEC §3).';

insert into public.workspace_settings (id, registration_open) values (1, false);

alter table public.workspace_settings enable row level security;

-- Anyone (even pre-auth, via the anon key) may READ the registration flag so
-- the login gate can show the right copy. Only admins may change it.
create policy "workspace_settings_read_all"
  on public.workspace_settings for select
  to anon, authenticated
  using (true);

create policy "workspace_settings_admin_update"
  on public.workspace_settings for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
