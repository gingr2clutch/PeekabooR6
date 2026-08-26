-- Per-site preview photo for gadget bomb sites.
--
-- Until now a site card on /gadgets/[map] showed the linked floor's bird's-eye
-- blueprint, so two sites on the same floor looked identical. This column
-- holds a real photo of the site, uploaded per site, used as the card
-- thumbnail. The blueprint keeps its existing job: it is what you see after
-- clicking in, with the placement pins drawn over it.
--
-- Touches gadget_sites only. No peek table is read or altered.
--
-- Nullable with no default and no backfill: every existing row stays valid and
-- keeps rendering the blueprint thumbnail until a photo is uploaded for it.
-- That fallback is deliberate, not temporary — a site without a photo should
-- still show something.
--
-- Stores the public R2 URL, matching floors.birds_eye_url and
-- maps.cover_image_url. The image itself lives in R2 under gadget-sites/, so
-- nothing here holds binary data.
--
-- No RLS change needed. The policy on gadget_sites is row-level
-- (published = true) and applies to every column, so a new column is covered
-- by the existing policy the moment it exists.
--
-- Safe to re-run: add column if not exists.

alter table gadget_sites
  add column if not exists preview_image_url text;

comment on column gadget_sites.preview_image_url is
  'Public R2 URL of the site''s preview photo, shown as the card thumbnail. Null falls back to the linked floor''s blueprint.';


-- Verify: expect one row, data_type text, is_nullable YES.
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name = 'gadget_sites' and column_name = 'preview_image_url';
