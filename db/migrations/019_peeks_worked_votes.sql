-- 019_peeks_worked_votes.sql
-- Records real "Worked for me / Didn't work" votes from the public peek page
-- so a peek can graduate from its admin-seeded Effectiveness estimate to a
-- measured community success rate (worked_votes / vote_count).
--
-- vote_count already exists (added in the original schema, never incremented)
-- and now becomes the running TOTAL of votes; worked_votes is the count of
-- "Worked for me". Both start at 0 — there is no historical vote data to
-- migrate, and castVote no longer drifts success_rate, so the admin estimate
-- in base_success_rate stays intact.

alter table peeks
  add column if not exists worked_votes int not null default 0;

notify pgrst, 'reload schema';
