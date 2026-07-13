-- 022_profiles.sql
-- One row per auth user, holding the Pro flag Stripe will flip later. Nullable
-- of nothing, safe to run once. Existing and future users get a row via the
-- trigger + backfill below. Until this runs, getCurrentUser() reads is_pro as
-- false and the site works normally.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read ONLY their own profile. There is deliberately no client write
-- policy: is_pro is set server-side by the service role (the future Stripe
-- webhook), never by the browser.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
