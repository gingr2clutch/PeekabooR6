-- Adds a published flag to maps. Existing rows become drafts (false), so after
-- running this you'll need to flip the maps you want live from /admin/maps.

alter table maps
  add column if not exists published boolean not null default false;
