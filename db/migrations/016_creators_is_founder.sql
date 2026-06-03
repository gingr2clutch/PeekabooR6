-- 016_creators_is_founder.sql
-- Creators feature, phase 5: founder flag.
-- Marks a single special creator (or a small handful) so the public
-- /creators page can render their card with a distinct treatment —
-- gradient display name, soft glow, and a site-wide published-peek
-- count. Not exposed in the public claim form; an admin flips it
-- directly in Supabase Studio.
--
-- NOT NULL with default false so every existing row (and every future
-- claim) is treated as non-founder unless explicitly toggled. The
-- existing RLS policy still gates anon reads on approved_at — this
-- column does not change visibility.

alter table creators
  add column if not exists is_founder boolean not null default false;

notify pgrst, 'reload schema';
