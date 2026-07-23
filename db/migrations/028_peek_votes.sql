-- Permanent, append-only history of every LOGGED-IN vote. Rows are never
-- updated or deleted. Anonymous votes are one-time and NOT stored here (they
-- live only in the aggregate counters below + a browser localStorage flag).
create table if not exists peek_votes (
  id         uuid primary key default gen_random_uuid(),
  peek_id    uuid not null references peeks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  worked     boolean not null,
  created_at timestamptz not null default now()
);

-- Newest-vote-per-user lookups (cooldown + "your latest vote") and per-peek scans.
create index if not exists peek_votes_peek_user_created_idx
  on peek_votes(peek_id, user_id, created_at desc);
create index if not exists peek_votes_peek_idx on peek_votes(peek_id);

-- Locked down like peek_snapshots: RLS on, no public policies. All access goes
-- through the service-role server action (supabaseAdmin), which bypasses RLS.
alter table peek_votes enable row level security;

-- The existing aggregate counters on peeks now hold the CURRENT-GRADE set:
--   vote_count   = distinct current voters (each user's LATEST vote + each
--                  one-time anonymous vote) — the grade denominator.
--   worked_votes = how many of those said "worked".
-- A re-vote never grows vote_count (same person); it only shifts worked_votes
-- if they flipped. So one person is never counted 5x, and rating() keeps working.
--
-- total_casts is DISPLAY-ONLY: every cast ever (repeats included). Never feeds
-- the grade. Lets the UI show honest "N votes · M players".
alter table peeks
  add column if not exists total_casts int not null default 0;

-- Before re-voting existed, every counted vote was also one distinct cast, so
-- total casts == current vote_count. (Runs once; guarded for safe re-runs.)
update peeks set total_casts = vote_count where total_casts = 0;
