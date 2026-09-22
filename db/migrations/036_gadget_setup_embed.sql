-- A setup's clip can be an embed, not just a hosted file.
--
-- 034 made video_url NOT NULL on the reasoning that pins explain nothing
-- without a clip. That reasoning still holds; what changed is where the clip
-- can live. The community submissions in the queue arrive as Medal.tv links,
-- and Medal's underlying file is not hotlinkable — cdn.medal.tv returns 403 —
-- so <video src> cannot render them. Their player page can be framed, so the
-- link is kept as-is and embedded.
--
-- This mirrors how peeks already handle the same problem: a peek has video_url
-- for a hosted file and tiktok_url for an external clip, and the page picks a
-- renderer. gadget_setups gets the same shape.
--
-- The CHECK is the important part. Dropping NOT NULL looks like it reverses
-- 034's decision, but the constraint preserves it exactly: every setup must
-- still have a clip, it just may be hosted OR embedded. A setup with neither
-- is still rejected by the database.
--
-- Numbered 036 because 035 is reserved for dropping gadget_placements, which
-- is a separate decision and not yet taken.
--
-- Additive and safe on the existing rows: every current setup has a video_url,
-- so the CHECK is satisfied the moment it is added.
--
-- Nothing here touches a peek table.

alter table gadget_setups
add column if not exists embed_url text;

alter table gadget_setups
alter column video_url drop not null;

alter table gadget_setups
drop constraint if exists gadget_setups_needs_clip;

alter table gadget_setups
add constraint gadget_setups_needs_clip
check (video_url is not null or embed_url is not null);


/* ---------------------------------------------------------------------------
   VERIFY
--------------------------------------------------------------------------- */
-- Column present and video_url now nullable:
--
-- select column_name, is_nullable from information_schema.columns
--  where table_name = 'gadget_setups'
--    and column_name in ('video_url','embed_url');
--
-- The constraint exists:
-- select conname from pg_constraint where conname = 'gadget_setups_needs_clip';
--
-- Every existing row still satisfies it (expect 0):
-- select count(*) from gadget_setups
--  where video_url is null and embed_url is null;
--
-- Untouched:
-- select count(*) from peeks;   -- 216 at the time of writing
