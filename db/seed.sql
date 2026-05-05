-- peekabooR6 seed. Paste into Supabase SQL editor and run AFTER schema.sql.
-- Safe to re-run: every insert is on conflict do nothing.

-- 14 ranked maps.
insert into maps (slug, name) values
  ('bank',             'Bank'),
  ('border',           'Border'),
  ('chalet',           'Chalet'),
  ('clubhouse',        'Clubhouse'),
  ('consulate',        'Consulate'),
  ('emerald-plains',   'Emerald Plains'),
  ('favela',           'Favela'),
  ('fortress',         'Fortress'),
  ('kafe-dostoyevsky', 'Kafe Dostoyevsky'),
  ('kanal',            'Kanal'),
  ('lair',             'Lair'),
  ('nighthaven-labs',  'Nighthaven Labs'),
  ('skyscraper',       'Skyscraper'),
  ('theme-park',       'Theme Park')
on conflict (slug) do nothing;

-- Floors per map. display_order matches the order listed in the build prompt.

-- Bank: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'bank'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'bank'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'bank'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;

-- Border: first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'border'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'border'), 'second-floor', 'Second floor', 2)
on conflict (map_id, slug) do nothing;

-- Chalet: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'chalet'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'chalet'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'chalet'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;

-- Clubhouse: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'clubhouse'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'clubhouse'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'clubhouse'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;

-- Consulate: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'consulate'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'consulate'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'consulate'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;

-- Emerald Plains: first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'emerald-plains'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'emerald-plains'), 'second-floor', 'Second floor', 2)
on conflict (map_id, slug) do nothing;

-- Favela: first-floor, second-floor, third-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'favela'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'favela'), 'second-floor', 'Second floor', 2),
  ((select id from maps where slug = 'favela'), 'third-floor',  'Third floor',  3)
on conflict (map_id, slug) do nothing;

-- Fortress: first-floor, second-floor, third-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'fortress'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'fortress'), 'second-floor', 'Second floor', 2),
  ((select id from maps where slug = 'fortress'), 'third-floor',  'Third floor',  3)
on conflict (map_id, slug) do nothing;

-- Kafe Dostoyevsky: first-floor, second-floor, third-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'kafe-dostoyevsky'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'kafe-dostoyevsky'), 'second-floor', 'Second floor', 2),
  ((select id from maps where slug = 'kafe-dostoyevsky'), 'third-floor',  'Third floor',  3)
on conflict (map_id, slug) do nothing;

-- Kanal: lower-bridge, upper-bridge, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'kanal'), 'lower-bridge', 'Lower bridge', 1),
  ((select id from maps where slug = 'kanal'), 'upper-bridge', 'Upper bridge', 2),
  ((select id from maps where slug = 'kanal'), 'first-floor',  'First floor',  3),
  ((select id from maps where slug = 'kanal'), 'second-floor', 'Second floor', 4)
on conflict (map_id, slug) do nothing;

-- Lair: first-floor, second-floor, third-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'lair'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'lair'), 'second-floor', 'Second floor', 2),
  ((select id from maps where slug = 'lair'), 'third-floor',  'Third floor',  3)
on conflict (map_id, slug) do nothing;

-- Nighthaven Labs: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'nighthaven-labs'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'nighthaven-labs'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'nighthaven-labs'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;

-- Skyscraper: first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'skyscraper'), 'first-floor',  'First floor',  1),
  ((select id from maps where slug = 'skyscraper'), 'second-floor', 'Second floor', 2)
on conflict (map_id, slug) do nothing;

-- Theme Park: basement, first-floor, second-floor
insert into floors (map_id, slug, name, display_order) values
  ((select id from maps where slug = 'theme-park'), 'basement',     'Basement',     1),
  ((select id from maps where slug = 'theme-park'), 'first-floor',  'First floor',  2),
  ((select id from maps where slug = 'theme-park'), 'second-floor', 'Second floor', 3)
on conflict (map_id, slug) do nothing;
