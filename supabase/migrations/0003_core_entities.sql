-- ─────────────────────────────────────────────────────────────────────────────
-- 0003 — Core entities: material categories, machines, materials, recipes.
--
-- All user data is per-account (DATA_MODEL): every row carries owner_id default
-- auth.uid(), and RLS restricts every operation to the owner. The parameter
-- schema (PARAM_DEFS / TYPE_PARAMS / MACHINE_TYPES / ADDONS) lives as TS
-- constants, not tables — only the *values* (ranges, params) are stored here as
-- jsonb keyed by param key.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.machine_type as enum ('co2', 'fiber', 'diode', 'uv', 'ir');
create type public.hazard_level as enum ('low', 'medium', 'high');
create type public.recipe_process as enum ('cut', 'engrave', 'mark');
create type public.recipe_status as enum ('draft', 'cal', 'review', 'fail');

-- ── Material categories (user-managed list feeding the material dropdown) ─────
create table public.material_categories (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- ── Machines (a laser + its capabilities; drives ranges/recipes/calibration) ──
create table public.machines (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  manufacturer text not null default '',
  model        text not null default '',
  type         public.machine_type not null,
  watts        integer not null default 0,
  bed_w        integer not null default 0,
  bed_h        integer not null default 0,
  lens         text not null default '',           -- lens/module identity (ComMarker 70/150mm, Snapmaker 2W/10W)
  addons       text[] not null default '{}',        -- set of ADDONS ids present
  ranges       jsonb not null default '{}'::jsonb,  -- param key → {min,max} | {max}; only type-relevant keys meaningful
  last_used    timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Materials ────────────────────────────────────────────────────────────────
create table public.materials (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  category_id uuid references public.material_categories (id) on delete set null,
  thickness   text not null default '',
  hazard      public.hazard_level not null default 'low',
  grade       text not null default '',
  safe_power  text not null default '',
  notes       text not null default '',
  safety      text not null default '',
  photo_path  text,                                 -- Storage ref (wired in a later phase)
  created_at  timestamptz not null default now()
);

-- ── Recipes ──────────────────────────────────────────────────────────────────
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id   uuid references public.materials (id) on delete set null,
  material_name text not null default '',           -- denormalized for display/robustness
  name          text not null,
  process       public.recipe_process not null default 'cut',
  machine_id    uuid references public.machines (id) on delete set null,
  thickness     text not null default '',
  params        jsonb not null default '{}'::jsonb, -- values keyed by param key; shown via machine type's TYPE_PARAMS
  status        public.recipe_status not null default 'draft',
  attempts      integer not null default 0,
  notes         text not null default '',
  verified_by   text not null default '',
  last_verified text not null default '',
  -- Provenance (set when promoted from a calibration run — table lands in Phase 5;
  -- kept as a bare uuid now, FK added with that migration).
  cal_run_id    uuid,
  cal_tests     integer,
  favorite      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index on public.material_categories (owner_id, position);
create index on public.machines (owner_id);
create index on public.materials (owner_id);
create index on public.recipes (owner_id);
create index on public.recipes (machine_id);
create index on public.recipes (material_id);

-- ── RLS: every entity is owner-scoped ────────────────────────────────────────
alter table public.material_categories enable row level security;
alter table public.machines enable row level security;
alter table public.materials enable row level security;
alter table public.recipes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['material_categories','machines','materials','recipes'] loop
    execute format($f$
      create policy "%1$s_owner_all" on public.%1$s
        for all to authenticated
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- ── Default material categories, seeded per user ─────────────────────────────
create or replace function public.seed_default_material_categories(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cats text[] := array[
    'Wood','Acrylic','Metal','Glass / Ceramics','Stone / Slate','Leather',
    'Paper / Card','Fabric / Textile','Plastic / Silicone','Tumblers / Drinkware',
    'Coated / Anodized','Food','Other'
  ];
  i int;
begin
  for i in 1 .. array_length(cats, 1) loop
    insert into public.material_categories (owner_id, name, position)
    values (uid, cats[i], i)
    on conflict (owner_id, name) do nothing;
  end loop;
end;
$$;

-- Extend the new-user hook to also seed default categories.
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
  return new;
end;
$$;

-- Backfill categories for users that already exist (first admin, any early members).
do $$
declare u record;
begin
  for u in select id from public.profiles loop
    perform public.seed_default_material_categories(u.id);
  end loop;
end $$;
