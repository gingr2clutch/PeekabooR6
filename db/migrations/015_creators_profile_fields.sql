-- 015_creators_profile_fields.sql
-- Creators feature, phase 4: optional profile enrichment.
-- All new columns are nullable so existing claimed rows stay valid and
-- the claim form can keep these fields strictly optional. No backfill.
--
-- rank / region / platform are stored as free text rather than enums:
-- the lists evolve (Siege adds ranks, new regions get carved out) and a
-- nullable text column lets the app layer own the dropdown choices
-- without a migration each time. The /creators page only renders
-- exact-match badges, so unrecognised values just don't show.
--
-- youtube_url / twitch_url / x_url are validated app-side as http(s)
-- URLs in claimCodeAction — kept loose at the DB level for the same
-- reason (no CHECK constraints to evolve).

alter table creators
  add column if not exists rank text,
  add column if not exists region text,
  add column if not exists platform text,
  add column if not exists youtube_url text,
  add column if not exists twitch_url text,
  add column if not exists x_url text;

notify pgrst, 'reload schema';
