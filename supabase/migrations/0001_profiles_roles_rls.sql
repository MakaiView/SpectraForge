-- ─────────────────────────────────────────────────────────────────────────────
-- 0001 — Profiles, roles, and Row-Level Security.
--
-- One Profile per auth.users row. `role` (admin|member) drives Admin Console
-- visibility AND server-side authorization via RLS (BUILD_SPEC §3b). `active`
-- gates login. Authorization is enforced HERE in Postgres — the client is never
-- trusted. Hiding nav is UX; RLS is security.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'member');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text        not null default '',
  email      text        not null,
  role       public.user_role not null default 'member',
  company    text        not null default '',
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user; role + active drive authz (BUILD_SPEC §3).';

alter table public.profiles enable row level security;

-- ── Helper: is the current caller an active admin? ───────────────────────────
-- SECURITY DEFINER + a stable search_path so the function can read profiles
-- without tripping the very RLS policies that call it (avoids recursion).
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- ── Policies ─────────────────────────────────────────────────────────────────
-- Read: a user sees their own profile; admins see everyone.
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_active_admin());

-- Update: a user may edit only their own name/company (role/active are locked
-- via the trigger below); admins may update anyone.
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_active_admin())
  with check (id = auth.uid() or public.is_active_admin());

-- Insert + delete of profiles happen through admin server routes using the
-- service role (which bypasses RLS), so no INSERT/DELETE policy is granted to
-- ordinary authenticated users.

-- ── Guard: non-admins cannot escalate their own role or flip `active`. ───────
-- Even with the self-update policy, a member editing their profile must not be
-- able to change role/active. Admins (service role or is_active_admin) may.
create or replace function public.enforce_profile_privilege_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_active_admin() then
    return new; -- admins may change anything
  end if;
  if new.role is distinct from old.role then
    raise exception 'Only admins can change role';
  end if;
  if new.active is distinct from old.active then
    raise exception 'Only admins can change active status';
  end if;
  return new;
end;
$$;

create trigger profiles_privilege_lock
  before update on public.profiles
  for each row execute function public.enforce_profile_privilege_lock();

-- ── Auto-create a profile row when an auth user is created. ──────────────────
-- Name/company/role come from the sign-up metadata (registration route sets
-- them); role defaults to member. The first-admin seed sets role=admin directly.
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
