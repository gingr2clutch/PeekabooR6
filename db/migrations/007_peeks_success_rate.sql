-- Replaces the helpful/total vote counters from migration 006 with a single
-- success_rate gauge (0-100, starts at 50). Helpful_votes/total_votes were
-- never displayed to users so dropping them is safe.

alter table peeks drop column if exists helpful_votes;
alter table peeks drop column if exists total_votes;

alter table peeks
  add column if not exists success_rate int not null default 50
  check (success_rate between 0 and 100);
