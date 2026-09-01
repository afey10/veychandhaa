-- =====================================================================
-- Tha. Veymandoo Police Chandhaa — Supabase Database Schema
-- =====================================================================
-- Run this entire file once in the Supabase SQL Editor on a fresh
-- project (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- It is safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE
-- where practical, but on a brand-new project just run it top to bottom.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('administrator', 'staff', 'view_only');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'bank_transfer', 'other');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. profiles — one row per authenticated user, linked to auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  service_number text not null unique,
  full_name text not null,
  role user_role not null default 'view_only',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_service_number on public.profiles (service_number);

-- ---------------------------------------------------------------------
-- 3. expense_categories
-- ---------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. chandhaa — monthly collection records
-- ---------------------------------------------------------------------
create table if not exists public.chandhaa (
  id uuid primary key default gen_random_uuid(),
  contributor_name text not null,
  service_number text,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2100),
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  payment_method payment_method not null default 'cash',
  reference_number text,
  remarks text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chandhaa_month_year on public.chandhaa (year, month);
create index if not exists idx_chandhaa_contributor on public.chandhaa (contributor_name);
create index if not exists idx_chandhaa_payment_date on public.chandhaa (payment_date);
create index if not exists idx_chandhaa_created_by on public.chandhaa (created_by);

-- ---------------------------------------------------------------------
-- 5. expenses
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category_id uuid not null references public.expense_categories (id),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method payment_method not null default 'cash',
  reference_number text,
  remarks text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses (expense_date);
create index if not exists idx_expenses_category on public.expenses (category_id);
create index if not exists idx_expenses_created_by on public.expenses (created_by);

-- ---------------------------------------------------------------------
-- 6. audit_logs — optional record of important administrator actions
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  action text not null,
  table_name text not null,
  record_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.expense_categories;
create trigger trg_categories_updated_at before update on public.expense_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_chandhaa_updated_at on public.chandhaa;
create trigger trg_chandhaa_updated_at before update on public.chandhaa
  for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Helper functions to determine the authenticated user's role
--    (SECURITY DEFINER so they can read profiles regardless of RLS,
--    without exposing the profiles table itself)
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(active, false) from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() = 'administrator' and public.current_user_active();
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('administrator', 'staff') and public.current_user_active();
$$;

create or replace function public.is_authenticated_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_active();
$$;

-- Prevent removing the last active administrator via direct UPDATE.
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_admins int;
begin
  if old.role = 'administrator' and (new.role <> 'administrator' or new.active = false) then
    select count(*) into remaining_admins
    from public.profiles
    where role = 'administrator' and active = true and id <> old.id;

    if remaining_admins = 0 then
      raise exception 'Cannot remove or disable the last active administrator.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_last_admin_removal on public.profiles;
create trigger trg_prevent_last_admin_removal
  before update on public.profiles
  for each row execute function public.prevent_last_admin_removal();

-- Lock down created_by / created_at so end users cannot forge audit fields.
create or replace function public.stamp_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();
  new.created_at = now();
  new.updated_by = null;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.stamp_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chandhaa_stamp_insert on public.chandhaa;
create trigger trg_chandhaa_stamp_insert before insert on public.chandhaa
  for each row execute function public.stamp_created_by();
drop trigger if exists trg_chandhaa_stamp_update on public.chandhaa;
create trigger trg_chandhaa_stamp_update before update on public.chandhaa
  for each row execute function public.stamp_updated_by();

drop trigger if exists trg_expenses_stamp_insert on public.expenses;
create trigger trg_expenses_stamp_insert before insert on public.expenses
  for each row execute function public.stamp_created_by();
drop trigger if exists trg_expenses_stamp_update on public.expenses;
create trigger trg_expenses_stamp_update before update on public.expenses
  for each row execute function public.stamp_updated_by();

-- ---------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.expense_categories enable row level security;
alter table public.chandhaa enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- profiles -------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin_only" on public.profiles;
create policy "profiles_insert_admin_only"
  on public.profiles for insert
  with check (public.is_admin());
  -- Note: the admin-users Edge Function uses the service-role key, which
  -- bypasses RLS entirely — this policy protects direct client inserts.

drop policy if exists "profiles_update_admin_or_self_limited" on public.profiles;
create policy "profiles_update_admin_or_self_limited"
  on public.profiles for update
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());
  -- Self-updates are further restricted at the application layer to
  -- non-sensitive fields; role/active changes should go through the
  -- Administration > Users screen (admin-only in the UI).

drop policy if exists "profiles_delete_admin_only" on public.profiles;
create policy "profiles_delete_admin_only"
  on public.profiles for delete
  using (public.is_admin());

-- expense_categories -----------------------------------------------------
drop policy if exists "categories_select_active_users" on public.expense_categories;
create policy "categories_select_active_users"
  on public.expense_categories for select
  using (public.is_authenticated_active_user());

drop policy if exists "categories_insert_admin_only" on public.expense_categories;
create policy "categories_insert_admin_only"
  on public.expense_categories for insert
  with check (public.is_admin());

drop policy if exists "categories_update_admin_only" on public.expense_categories;
create policy "categories_update_admin_only"
  on public.expense_categories for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories_delete_admin_only" on public.expense_categories;
create policy "categories_delete_admin_only"
  on public.expense_categories for delete
  using (public.is_admin());

-- chandhaa ---------------------------------------------------------------
drop policy if exists "chandhaa_select_active_users" on public.chandhaa;
create policy "chandhaa_select_active_users"
  on public.chandhaa for select
  using (public.is_authenticated_active_user());

drop policy if exists "chandhaa_insert_staff_or_admin" on public.chandhaa;
create policy "chandhaa_insert_staff_or_admin"
  on public.chandhaa for insert
  with check (public.is_staff_or_admin());

drop policy if exists "chandhaa_update_staff_or_admin" on public.chandhaa;
create policy "chandhaa_update_staff_or_admin"
  on public.chandhaa for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop policy if exists "chandhaa_delete_admin_only" on public.chandhaa;
create policy "chandhaa_delete_admin_only"
  on public.chandhaa for delete
  using (public.is_admin());

-- expenses -----------------------------------------------------------------
drop policy if exists "expenses_select_active_users" on public.expenses;
create policy "expenses_select_active_users"
  on public.expenses for select
  using (public.is_authenticated_active_user());

drop policy if exists "expenses_insert_staff_or_admin" on public.expenses;
create policy "expenses_insert_staff_or_admin"
  on public.expenses for insert
  with check (public.is_staff_or_admin());

drop policy if exists "expenses_update_staff_or_admin" on public.expenses;
create policy "expenses_update_staff_or_admin"
  on public.expenses for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop policy if exists "expenses_delete_admin_only" on public.expenses;
create policy "expenses_delete_admin_only"
  on public.expenses for delete
  using (public.is_admin());

-- audit_logs -----------------------------------------------------------------
drop policy if exists "audit_logs_select_admin_only" on public.audit_logs;
create policy "audit_logs_select_admin_only"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "audit_logs_insert_active_users" on public.audit_logs;
create policy "audit_logs_insert_active_users"
  on public.audit_logs for insert
  with check (public.is_authenticated_active_user());
  -- No update/delete policies -> audit logs are append-only for all roles.

-- ---------------------------------------------------------------------
-- 10. Seed default expense categories
-- ---------------------------------------------------------------------
insert into public.expense_categories (name) values
  ('Food'), ('Transportation'), ('Station Activities'), ('Equipment'),
  ('Maintenance'), ('Events'), ('Office Supplies'), ('Utilities'), ('Other')
on conflict (name) do nothing;

-- =====================================================================
-- End of schema. Next steps:
--   1. Create your first administrator (see README.md, "First Administrator").
--   2. Deploy the admin-users Edge Function (see supabase/functions/admin-users).
--   3. Add staff and view-only accounts from Administration > Users.
-- =====================================================================
