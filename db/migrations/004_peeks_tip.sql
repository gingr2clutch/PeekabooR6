-- Adds an optional pro tip to peeks. Renders below Difficulty/Risk on the
-- public detail page when present.

alter table peeks
  add column if not exists tip text;
