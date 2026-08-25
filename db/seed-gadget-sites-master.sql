-- Master bomb-site seed: 51 gadget_sites across 16 maps, all as drafts.
--
-- APPLIED 2026-08-25. This file reproduces what is currently in the database;
-- keep the two in step if either changes.
--
-- Seed data, not schema — deliberately NOT numbered into db/migrations/,
-- which holds structural changes only. Run by hand in the Supabase SQL editor.
--
-- SUPERSEDES db/seed-gadget-sites.sql. That earlier file was never run
-- (gadget_sites was empty when this was written) and covers Clubhouse, Chalet
-- and Kafe with DIFFERENT slugs for the same rooms — e.g. chalet
-- 'kitchen-dining-room' there vs 'kitchen-dining' here. Running both would
-- leave near-duplicate sites that the (map_id, slug) guard cannot catch,
-- because the slugs differ. Run ONE of the two files, not both.
--
-- Touches gadget_sites only. No peek table is read or written.
--
-- Map and floor ids are resolved by slug rather than pasted in, so this stays
-- correct if a row is ever recreated. Verified against the live database:
-- all 16 maps exist and every (map, floor) pair below resolves.
--
-- published stays false: these land as drafts so placements can be added
-- before anything goes live. Publishing is per-site in /admin/gadgets.
--
-- Safe to re-run: unique (map_id, slug) plus ON CONFLICT DO NOTHING, so a
-- second run inserts nothing and edits made since are left alone.
--
-- NOT INCLUDED — held for confirmation, see the block at the end of this file:
--   coastline      2F  Penthouse / Theater  (vs "Blue / Sunrise")
--   emerald-plains 2F  Admin / Meeting      (naming unsettled)


/* ---------------------------------------------------------------------------
   PRE-FLIGHT (optional). Run this first.

   The insert below inner-joins floors, so a wrong floor slug silently drops
   its row instead of erroring. This returns any pair that will NOT resolve.
   Expect zero rows. If anything comes back, fix it before inserting.
--------------------------------------------------------------------------- */
-- select v.map_slug, v.floor_slug, v.name,
--        m.id is null as map_missing,
--        f.id is null as floor_missing
-- from (values
--   ('bank','basement','x','x',0)
-- ) as v(map_slug, floor_slug, slug, name, display_order)
-- left join maps   m on m.slug = v.map_slug
-- left join floors f on f.map_id = m.id and f.slug = v.floor_slug
-- where m.id is null or f.id is null;


insert into gadget_sites (map_id, floor_id, slug, name, display_order, published)
select m.id, f.id, v.slug, v.name, v.display_order, false
from (values
  -- Bank
  ('bank',             'basement',     'lockers-cctv',                  'Lockers / CCTV',                  1),
  ('bank',             'first-floor',  'open-area-kitchen',             'Open Area / Kitchen',             2),
  ('bank',             'second-floor', 'ceo-office-lounge',             'CEO Office / Lounge',             3),

  -- Border
  ('border',           'first-floor',  'tellers-bathroom',              'Tellers / Bathroom',              1),
  ('border',           'first-floor',  'workshop-ventilation',          'Workshop / Ventilation',          2),
  ('border',           'second-floor', 'armory-archives',               'Armory / Archives',               3),

  -- Chalet
  ('chalet',           'basement',     'wine-cellar-snowmobile-garage', 'Wine Cellar / Snowmobile Garage', 1),
  ('chalet',           'first-floor',  'kitchen-dining',                'Kitchen / Dining',                2),
  ('chalet',           'first-floor',  'bar-gaming',                    'Bar / Gaming',                    3),
  ('chalet',           'second-floor', 'master-bedroom-office',         'Master Bedroom / Office',         4),

  -- Clubhouse (layout confirmed 2026-08-25)
  ('clubhouse',        'basement',     'church-arsenal',                'Church / Arsenal',                1),
  ('clubhouse',        'first-floor',  'cash-cctv',                     'Cash / CCTV',                     2),
  ('clubhouse',        'second-floor', 'gym-bedroom',                   'Gym / Bedroom',                   3),

  -- Coastline (2F held for confirmation)
  ('coastline',        'first-floor',  'kitchen-service',               'Kitchen / Service',               1),
  ('coastline',        'first-floor',  'hookah-billiards',              'Hookah / Billiards',              2),

  -- Consulate
  ('consulate',        'basement',     'servers-tellers',               'Servers / Tellers',               1),
  ('consulate',        'first-floor',  'garage-cafeteria',              'Garage / Cafeteria',              2),
  ('consulate',        'first-floor',  'exposition-piano',              'Exposition / Piano',              3),
  ('consulate',        'second-floor', 'ceo-office-meeting',            'CEO Office / Meeting',            4),

  -- Emerald Plains (2F held for confirmation)
  ('emerald-plains',   'first-floor',  'meeting-dining',                'Meeting / Dining',                1),
  ('emerald-plains',   'first-floor',  'kitchen-service',               'Kitchen / Service',               2),

  -- Fortress
  ('fortress',         'first-floor',  'waiting-room-cafeteria',        'Waiting Room / Cafeteria',        1),
  ('fortress',         'second-floor', 'commanders-office-bathroom',    'Commander''s Office / Bathroom',  2),
  ('fortress',         'second-floor', 'dormitory-games-room',          'Dormitory / Games Room',          3),

  -- Kafe Dostoyevsky
  ('kafe-dostoyevsky', 'first-floor',  'reading-room-dining',           'Reading Room / Dining',           1),
  ('kafe-dostoyevsky', 'second-floor', 'mining-room-train-museum',      'Mining Room / Train Museum',      2),
  ('kafe-dostoyevsky', 'third-floor',  'cocktail-lounge-bar',           'Cocktail Lounge / Bar',           3),

  -- Nighthaven Labs
  ('nighthaven-labs',  'first-floor',  'kitchen-assembly',              'Kitchen / Assembly',              1),
  ('nighthaven-labs',  'first-floor',  'server-storage',                'Server / Storage',                2),
  ('nighthaven-labs',  'second-floor', 'lab-lab-support',               'Lab / Lab Support',               3),
  ('nighthaven-labs',  'second-floor', 'bunks-briefing',                'Bunks / Briefing',                4),

  -- Oregon
  ('oregon',           'basement',     'laundry-supply',                'Laundry / Supply',                1),
  ('oregon',           'first-floor',  'kitchen-dining',                'Kitchen / Dining',                2),
  ('oregon',           'first-floor',  'meeting-kitchen',               'Meeting / Kitchen',               3),
  ('oregon',           'second-floor', 'kids-dorms-dorm-main',          'Kids Dorms / Dorm Main',          4),

  -- Outback
  ('outback',          'first-floor',  'party-office',                  'Party / Office',                  1),
  ('outback',          'first-floor',  'nature-kitchen',                'Nature / Kitchen',                2),
  ('outback',          'second-floor', 'bathroom-garage',               'Bathroom / Garage',               3),

  -- Skyscraper
  ('skyscraper',       'first-floor',  'office-work',                   'Office / Work',                   1),
  ('skyscraper',       'second-floor', 'geisha-karaoke',                'Geisha / Karaoke',                2),
  ('skyscraper',       'second-floor', 'bedroom-bathroom',              'Bedroom / Bathroom',              3),

  -- Theme Park
  ('theme-park',       'first-floor',  'initiation-office',             'Initiation / Office',             1),
  ('theme-park',       'first-floor',  'daycare-bunk',                  'Daycare / Bunk',                  2),
  ('theme-park',       'second-floor', 'throne-armory',                 'Throne / Armory',                 3),
  ('theme-park',       'second-floor', 'drug-lab-storage',              'Drug Lab / Storage',              4),

  -- Villa
  ('villa',            'first-floor',  'aviator-room-games-room',       'Aviator Room / Games Room',       1),
  ('villa',            'first-floor',  'trophy-room-statuary',          'Trophy Room / Statuary',          2),

  -- Calypso Casino
  ('calypso-casino',   'basement',     'cctv-vault-checkpoint',         'CCTV / Vault Checkpoint',         1),
  ('calypso-casino',   'first-floor',  'blackjack-poker',               'Blackjack / Poker',               2),
  ('calypso-casino',   'first-floor',  'bar-betting',                   'Bar / Betting',                   3),
  ('calypso-casino',   'second-floor', 'cigar-room-pool',               'Cigar Room / Pool',               4)
) as v(map_slug, floor_slug, slug, name, display_order)
join maps   m on m.slug = v.map_slug
join floors f on f.map_id = m.id and f.slug = v.floor_slug
on conflict (map_id, slug) do nothing;


/* ---------------------------------------------------------------------------
   VERIFY. Expect 51 rows, every one published = false, each with a floor.
--------------------------------------------------------------------------- */
-- select m.name as map, f.name as floor, s.name as site,
--        s.display_order, s.published
-- from gadget_sites s
-- join maps m on m.id = s.map_id
-- left join floors f on f.id = s.floor_id
-- order by m.name, s.display_order;

-- Row count per map, to confirm nothing was silently dropped by the join:
-- select m.slug, count(*)
-- from gadget_sites s join maps m on m.id = s.map_id
-- group by m.slug order by m.slug;


/* ---------------------------------------------------------------------------
   HELD — do not run until the naming is confirmed.

   Uncomment whichever lines are correct, then run this block on its own. It
   uses the same conflict guard, so it is safe alongside the insert above.
--------------------------------------------------------------------------- */
-- insert into gadget_sites (map_id, floor_id, slug, name, display_order, published)
-- select m.id, f.id, v.slug, v.name, v.display_order, false
-- from (values
--   -- Coastline 2F — pick ONE of these two:
--   ('coastline',      'second-floor', 'penthouse-theater',  'Penthouse / Theater',  3),
--   ('coastline',      'second-floor', 'blue-sunrise',       'Blue / Sunrise',       3),
--
--   -- Emerald Plains 2F — confirm the name:
--   ('emerald-plains', 'second-floor', 'admin-meeting',      'Admin / Meeting',      3)
-- ) as v(map_slug, floor_slug, slug, name, display_order)
-- join maps   m on m.slug = v.map_slug
-- join floors f on f.map_id = m.id and f.slug = v.floor_slug
-- on conflict (map_id, slug) do nothing;
