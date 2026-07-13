-- 023_favorites.sql
-- Per-user saved peeks. user_id defaults to the caller's auth.uid() so the
-- browser can insert with just peek_id; RLS makes every row private to its
-- owner. Safe to run once.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  peek_id uuid not null references public.peeks (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, peek_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

-- Each policy is scoped to auth.uid() = user_id, so a user can only ever read,
-- add, or remove their OWN favorites.
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);
