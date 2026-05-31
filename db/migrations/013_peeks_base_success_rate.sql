-- 013_peeks_base_success_rate.sql
-- Adds a separate "base" column so admin saves stop overwriting whatever
-- the public votes have drifted success_rate to. Backfill: every row's
-- current success_rate becomes the base (we have no signal that any of
-- the existing values came from votes — vote_count = 0 everywhere — so
-- this is just freezing today's admin intent into the new column).
--
-- Steps 1+2 of the rate-system rebuild. Display still reads success_rate;
-- castVote still writes success_rate. Only the admin edit-form save path
-- moves to the new column, which closes the 67/68 collapse mechanism.

alter table peeks
  add column if not exists base_success_rate int not null default 50
  check (base_success_rate between 0 and 100);

update peeks set base_success_rate = success_rate;

notify pgrst, 'reload schema';
