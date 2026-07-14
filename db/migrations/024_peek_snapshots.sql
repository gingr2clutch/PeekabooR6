-- 024_peek_snapshots.sql
-- Daily historical snapshots of each peek's stats, for a future trending chart.
-- One row per peek per day; the unique (peek_id, captured_at) constraint makes
-- the daily job idempotent (a re-run can't double-insert). Written only by the
-- service role (the cron job); not read by public queries, so RLS is on with no
-- policies (service role bypasses it; anon/authenticated get nothing).

create table if not exists public.peek_snapshots (
  id uuid primary key default gen_random_uuid(),
  peek_id uuid not null references public.peeks (id) on delete cascade,
  effectiveness_pct integer not null,
  grade text not null,
  vote_count integer not null,
  captured_at date not null default (now() at time zone 'utc')::date,
  unique (peek_id, captured_at)
);

-- Fast time-series reads per peek (the eventual chart query).
create index if not exists peek_snapshots_peek_time_idx
  on public.peek_snapshots (peek_id, captured_at);

alter table public.peek_snapshots enable row level security;
