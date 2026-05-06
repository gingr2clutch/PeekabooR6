-- Adds a poster_url column for the auto-generated first-frame JPEG that the
-- public peek detail page uses as the <video poster=""> attribute. Optional
-- on existing rows; will populate when each video gets re-uploaded.

alter table peeks
  add column if not exists poster_url text;
