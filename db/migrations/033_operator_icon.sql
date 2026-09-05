-- Operator icons for the gadget picker.
--
-- Until now the picker had no image at all: gadget_operators carries name,
-- role and gadget_name only. This holds a public R2 URL, written by the admin
-- uploader at /admin/gadgets/operators.
--
-- Nullable with no backfill: every existing row stays valid and renders the
-- initial-letter disc until an icon is uploaded. That fallback is permanent,
-- not transitional — an operator without an icon should still show something.
--
-- No RLS change needed. The policy on gadget_operators is row-level
-- (published = true) and applies to every column, so a new column is covered
-- the moment it exists.
--
-- Touches gadget_operators only. No peek table is read or altered.
--
-- Safe to re-run: add column if not exists.

alter table gadget_operators
  add column if not exists icon_url text;

comment on column gadget_operators.icon_url is
  'Public R2 URL of the operator icon. Square, max 256x256. Null renders the initial disc.';

-- Verify: expect one row, data_type text, is_nullable YES.
--
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_name = 'gadget_operators' and column_name = 'icon_url';
