-- Adds the two vote counters used by the public peek page. The existing
-- useful_pct / vote_count columns from the original schema stay in place
-- (unused for now) — drop them in a later migration if you want.

alter table peeks
  add column if not exists helpful_votes int not null default 0,
  add column if not exists total_votes int not null default 0;
