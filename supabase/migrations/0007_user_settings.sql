-- ─────────────────────────────────────────────────────────────────────────────
-- 0007 — Per-user settings (preferences + AI config).
--
-- One row per user. Appearance (theme/accent), notifications, card identity,
-- onboarding flag, and the AI provider config. The AI api key lives here but is
-- NEVER sent to the browser — the Settings server component omits it (passes a
-- boolean) and the AI resolver reads it server-side (BUILD_SPEC §5). RLS scopes
-- every row to its owner.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_settings (
  id                 uuid primary key references auth.users (id) on delete cascade,
  theme              text not null default 'dark',
  accent             text not null default 'azure',
  ai_provider        text not null default 'ollama',
  ai_model           text not null default '',
  ai_base_url        text not null default '',
  ai_api_key         text not null default '',
  notif_calibration  boolean not null default true,
  notif_review       boolean not null default true,
  notif_tips         boolean not null default false,
  card_identity      text not null default 'both',   -- name | company | both | neither
  onboarded          boolean not null default false,
  updated_at         timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_owner_select" on public.user_settings
  for select to authenticated using (id = auth.uid());
create policy "user_settings_owner_update" on public.user_settings
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Rows are created by the new-user trigger (service definer); no INSERT policy
-- for ordinary users.

-- Seed a settings row when a profile/auth user is created, and extend the hook.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, company, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'company', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'member'),
    coalesce((new.raw_user_meta_data ->> 'active')::boolean, true)
  );
  perform public.seed_default_material_categories(new.id);
  insert into public.user_settings (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill settings rows for existing users.
insert into public.user_settings (id)
select id from public.profiles
on conflict (id) do nothing;
