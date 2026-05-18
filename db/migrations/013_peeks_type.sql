-- Categorises each peek so the floor-view pins can be color-coded by what
-- kind of play they are. Existing rows default to 'spawn' to preserve
-- behaviour; admins can re-categorise via the peek editor.
alter table peeks
  add column if not exists peek_type text not null default 'spawn'
  check (peek_type in ('spawn', 'runout', 'mid_round'));
