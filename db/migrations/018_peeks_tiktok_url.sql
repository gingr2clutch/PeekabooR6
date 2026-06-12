-- 018_peeks_tiktok_url.sql
-- Optional TikTok video link on peeks. When set, the public detail page
-- replaces the in-line video player with an "Open on TikTok" link, and
-- the floor pin renders with a purple→orange gradient + TikTok glyph so
-- visitors can tell at a glance that this peek's video lives off-site.
--
-- Nullable text — no default. Admin sets it directly in Supabase Studio
-- on a per-peek basis. No app-side validation beyond truthiness; if you
-- paste a bad URL, the link just opens to nowhere (recoverable by edit).

alter table peeks
  add column if not exists tiktok_url text;

notify pgrst, 'reload schema';
