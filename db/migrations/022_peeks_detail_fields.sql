-- 022_peeks_detail_fields.sql
-- Optional long-form detail fields for peeks, surfaced on the floor pages.
-- Both nullable — existing rows are unaffected and the UI renders a section
-- only when the field has content. ("The setup" reuses the existing
-- peeks.instructions array, so no new column is needed for it.)
alter table peeks add column if not exists common_mistakes text;
alter table peeks add column if not exists best_operators text;
