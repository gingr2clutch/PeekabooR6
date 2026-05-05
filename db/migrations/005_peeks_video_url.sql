-- Ensures peeks has a video_url column. The original schema already declared
-- it, so this is a no-op on existing databases — included for completeness so
-- a fresh setup that skipped schema.sql still gets the field.

alter table peeks
  add column if not exists video_url text;
