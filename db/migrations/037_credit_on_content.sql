-- Credit belongs to the published thing, not to the submission that made it.
--
-- Until now contributor_id lived only on community_submissions, reachable from
-- a peek or a setup by joining back through linked_peek_id /
-- linked_gadget_setup_id. That failed two ways:
--
--   1. The public pages read with the anon key, and RLS denies anon every row
--      of community_submissions. A credit line would have rendered the
--      fallback 100% of the time, including for clips that ARE credited.
--   2. Anything created directly in admin has no submission row at all, so it
--      could never be credited. That is why 190 of 192 published peeks show
--      nobody.
--
-- Routing a public page through community_submissions was the alternative and
-- was rejected: that table holds ip_hash, and exposing it to render a byline is
-- the wrong trade.
--
-- on delete set null, not cascade — removing a contributor must never delete
-- the peek or setup they filmed.

alter table peeks add column if not exists contributor_id uuid references contributors(id) on delete set null;

alter table gadget_setups add column if not exists contributor_id uuid references contributors(id) on delete set null;

create index if not exists peeks_contributor on peeks(contributor_id);

create index if not exists setups_contributor on gadget_setups(contributor_id);

-- Backfill from the submissions that already carry credit. Guarded on
-- "is null" so re-running cannot clobber credit set by hand afterwards.

update peeks p set contributor_id = s.contributor_id from community_submissions s where s.linked_peek_id = p.id and s.contributor_id is not null and p.contributor_id is null;

update gadget_setups g set contributor_id = s.contributor_id from community_submissions s where s.linked_gadget_setup_id = g.id and s.contributor_id is not null and g.contributor_id is null;

-- Anon currently reads zero rows from contributors, so the embedded join on the
-- public pages would come back empty. This exposes display_name, slug,
-- avatar_url and link_url to anonymous readers — all of which are already
-- public on /contributors, so it is not new exposure. is_hidden still wins.

alter table contributors enable row level security;

drop policy if exists contributors_public_read on contributors;

create policy contributors_public_read on contributors for select using (is_hidden = false);
