-- Gadget feature: bomb sites, the operators that place on them, and the
-- individual placements. Entirely new tables — nothing here reads, alters or
-- references any peek table except `maps` and `floors`, which are only
-- referenced (never modified).
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- Operators. A lookup table rather than a CHECK constraint, so adding an
-- operator later is an INSERT instead of an ALTER TABLE — R6 ships them
-- regularly.
-- ---------------------------------------------------------------------------
create table if not exists gadget_operators (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  role          text,
  gadget_name   text,
  display_order int not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Seed the three we already show. on conflict makes the migration idempotent
-- and means editing these rows later won't be undone by a re-run.
insert into gadget_operators (slug, name, role, gadget_name, display_order)
values
  ('denari',   'Denari',   'Support', null,                    1),
  ('valkyrie', 'Valkyrie', 'Intel',   'Black Eye',             2),
  ('kapkan',   'Kapkan',   'Trapper', 'Entry Denial Device',   3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Bomb sites belong to a map. Modelled on `floors`: per-map slug, explicit
-- display order.
--
-- floor_id is which blueprint to draw the pins on. Nullable so sites can be
-- created before that is decided, but until it is set the app has to guess a
-- floor — which is the current placeholder bug where Oregon's "Basement" site
-- renders the Second floor image.
--
-- on delete set null, not cascade: deleting a floor should orphan the drawing
-- surface, never silently delete the site and every placement under it.
-- ---------------------------------------------------------------------------
create table if not exists gadget_sites (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references maps(id)   on delete cascade,
  floor_id      uuid          references floors(id) on delete set null,
  slug          text not null,
  name          text not null,
  display_order int not null default 0,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (map_id, slug)
);

create index if not exists gadget_sites_map_order_idx
  on gadget_sites (map_id, display_order);

-- ---------------------------------------------------------------------------
-- One pinned placement on a site.
--
-- x_pct / y_pct match how peek pins are stored (percentages of the bird's-eye
-- box), so the same rendering maths works.
--
-- operator_id uses on delete restrict: you cannot delete an operator that still
-- has placements. Cascade would quietly destroy real content; restrict forces
-- the placements to be dealt with first.
--
-- thumbs_up / thumbs_down are plain counters for now. Deliberately no votes
-- history table, so there is no per-user re-vote or duplicate protection yet —
-- see the note at the bottom.
-- ---------------------------------------------------------------------------
create table if not exists gadget_placements (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references gadget_sites(id)     on delete cascade,
  operator_id  uuid not null references gadget_operators(id) on delete restrict,
  label        text,
  note         text,
  x_pct        numeric(5,2) not null check (x_pct between 0 and 100),
  y_pct        numeric(5,2) not null check (y_pct between 0 and 100),
  video_url    text,
  thumbs_up    int not null default 0 check (thumbs_up   >= 0),
  thumbs_down  int not null default 0 check (thumbs_down >= 0),
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- The app's main read: every placement on a site, grouped by operator.
create index if not exists gadget_placements_site_operator_idx
  on gadget_placements (site_id, operator_id);

-- ---------------------------------------------------------------------------
-- RLS. Same shape as `peeks`: public reads see published rows only, and there
-- are no write policies at all, so the anon key cannot insert, update or
-- delete. Admin writes use the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table gadget_operators  enable row level security;
alter table gadget_sites      enable row level security;
alter table gadget_placements enable row level security;

drop policy if exists "public read published gadget operators"  on gadget_operators;
drop policy if exists "public read published gadget sites"      on gadget_sites;
drop policy if exists "public read published gadget placements" on gadget_placements;

create policy "public read published gadget operators"
  on gadget_operators for select using (published = true);

create policy "public read published gadget sites"
  on gadget_sites for select using (published = true);

create policy "public read published gadget placements"
  on gadget_placements for select using (published = true);

-- ---------------------------------------------------------------------------
-- KNOWN GAP — thumbs voting has no public write path.
--
-- With RLS on and no INSERT/UPDATE policy, a visitor cannot increment these
-- counters directly. Voting must go through a server action using the
-- service-role key, which also means there is nothing stopping one person
-- voting repeatedly.
--
-- If per-user voting is wanted later, mirror peek_votes: an append-only
-- gadget_placement_votes table keyed on (placement_id, user_id), with these
-- columns kept as the aggregate. That is a follow-up migration, not this one.
-- ---------------------------------------------------------------------------
