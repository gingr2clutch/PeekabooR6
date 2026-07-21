-- 028_roulette_attempts.sql
-- Per-user Peek Roulette check-ins. Multiple attempts per peek allowed (no
-- unique constraint). user_id defaults to auth.uid() so the browser can insert
-- with just peek_id + hit; RLS keeps every row private to its owner. Mirrors
-- the favorites (023) pattern. Safe to run once.

create table if not exists public.roulette_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  peek_id uuid not null references public.peeks (id) on delete cascade,
  hit boolean not null,
  created_at timestamptz not null default now()
);

-- Indexes for the two future aggregate angles (per-peek hit %, per-user history)
-- and the per-day tally query (created_at).
create index if not exists roulette_attempts_user_idx on public.roulette_attempts (user_id);
create index if not exists roulette_attempts_peek_idx on public.roulette_attempts (peek_id);
create index if not exists roulette_attempts_created_idx on public.roulette_attempts (created_at);

alter table public.roulette_attempts enable row level security;

-- Own-rows only: a user can read and add their own attempts. No update policy
-- (attempts are immutable); delete-own included for parity with favorites.
drop policy if exists "roulette_attempts_select_own" on public.roulette_attempts;
create policy "roulette_attempts_select_own" on public.roulette_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "roulette_attempts_insert_own" on public.roulette_attempts;
create policy "roulette_attempts_insert_own" on public.roulette_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "roulette_attempts_delete_own" on public.roulette_attempts;
create policy "roulette_attempts_delete_own" on public.roulette_attempts
  for delete using (auth.uid() = user_id);
