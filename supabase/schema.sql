create extension if not exists pgcrypto;

create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin'))
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mc_version text not null default '',
  loader text not null default 'fabric',
  loader_version text not null default '',
  created_at_ms bigint not null default 0,
  profile_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_items (
  id text primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('mod', 'resourcepack', 'shader')),
  sort_order integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_account_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_packtracker on auth.users;
create trigger on_auth_user_created_packtracker
after insert on auth.users
for each row execute procedure public.handle_new_account_profile();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists profile_items_touch_updated_at on public.profile_items;
create trigger profile_items_touch_updated_at
before update on public.profile_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
before update on public.user_settings
for each row execute procedure public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.account_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_items enable row level security;

drop policy if exists "account_profiles_self_or_admin_select" on public.account_profiles;
create policy "account_profiles_self_or_admin_select"
on public.account_profiles
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_roles_self_or_admin_select" on public.user_roles;
create policy "user_roles_self_or_admin_select"
on public.user_roles
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_settings_own_rows" on public.user_settings;
create policy "user_settings_own_rows"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_own_rows" on public.profiles;
create policy "profiles_own_rows"
on public.profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profile_items_own_rows" on public.profile_items;
create policy "profile_items_own_rows"
on public.profile_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
