-- Adds a cover image URL to maps. Optional; nulls render the existing plain
-- card on the homepage. Populate via /admin/maps.

alter table maps
  add column if not exists cover_image_url text;
