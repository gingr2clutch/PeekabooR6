-- Bulk-add gadget bomb sites for Clubhouse, Chalet and Kafe Dostoyevsky.
--
-- Seed data, not schema — deliberately NOT numbered into db/migrations/, which
-- holds structural changes only. Run it by hand in the Supabase SQL editor.
--
-- Inserts into gadget_sites only. No peek table is read or written.
--
-- Map and floor ids are resolved by slug rather than pasted in, so this stays
-- correct if a row is ever recreated. Verified present when written:
--   clubhouse        a5875ddf-ad15-48e5-beca-7711049c3e96
--   chalet           7cc842cf-3a86-452b-8f79-401b479c585b
--   kafe-dostoyevsky e10b52f3-964d-4eb0-a26d-e3c3cfac2665
-- Floor slugs used: basement, first-floor, second-floor, third-floor.
-- (Kafe has no basement; nothing here asks for one.)
--
-- published stays false: these land as drafts so placements can be added before
-- anything goes live. Publishing is per-site in /admin/gadgets.
--
-- Safe to re-run: unique (map_id, slug) plus ON CONFLICT DO NOTHING, so a
-- second run inserts nothing and edits made since are left alone.

insert into gadget_sites (map_id, floor_id, slug, name, display_order, published)
select m.id, f.id, v.slug, v.name, v.display_order, false
from (values
  -- Clubhouse
  ('clubhouse',        'basement',     'church-arsenal',                'Church / Arsenal',               1),
  ('clubhouse',        'second-floor', 'gym-cash',                      'Gym / Cash',                     2),
  ('clubhouse',        'first-floor',  'bar-stock',                     'Bar / Stock',                    3),
  ('clubhouse',        'second-floor', 'cctv-cash',                     'CCTV / Cash',                    4),

  -- Chalet
  ('chalet',           'basement',     'wine-cellar-snowmobile-garage', 'Wine Cellar / Snowmobile Garage', 1),
  ('chalet',           'first-floor',  'bar-gaming-room',               'Bar / Gaming Room',              2),
  ('chalet',           'first-floor',  'kitchen-dining-room',           'Kitchen / Dining Room',          3),
  ('chalet',           'second-floor', 'master-bedroom-office',         'Master Bedroom / Office',        4),

  -- Kafe Dostoyevsky
  ('kafe-dostoyevsky', 'third-floor',  'cocktail-bar',                  'Cocktail / Bar',                 1),
  ('kafe-dostoyevsky', 'second-floor', 'fireplace-hall-mining-room',    'Fireplace Hall / Mining Room',   2),
  ('kafe-dostoyevsky', 'first-floor',  'kitchen-service-entrance',      'Kitchen / Service Entrance',     3),
  ('kafe-dostoyevsky', 'second-floor', 'reading-room-fireplace',        'Reading Room / Fireplace',       4)
) as v(map_slug, floor_slug, slug, name, display_order)
join maps   m on m.slug = v.map_slug
join floors f on f.map_id = m.id and f.slug = v.floor_slug
on conflict (map_id, slug) do nothing;

-- Verify: expect 12 rows, every one published = false, each with a floor.
--
-- select m.name as map, f.name as floor, s.name as site, s.display_order, s.published
-- from gadget_sites s
-- join maps m on m.id = s.map_id
-- left join floors f on f.id = s.floor_id
-- order by m.name, s.display_order;
