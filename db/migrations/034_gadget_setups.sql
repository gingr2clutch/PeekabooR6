-- Gadgets become SETUPS.
--
-- The model until now was one row per pin: a placement carried its own video,
-- its own votes and its own label. That is wrong for how gadget play actually
-- works. A setup is one plan for one bomb site by one operator — "Standard",
-- "Anti-rush" — and it has several pins and ONE video that explains them. The
-- pins are visual only: no grades, no votes, not clickable. The video does the
-- explaining and the numbered dots let a viewer follow along.
--
-- This migration is ADDITIVE ONLY. gadget_placements is still here and still
-- serving the live site; it is dropped in 035, after the app has moved over.
-- Running the drop first would break the four published Chalet gadget pages,
-- because lib/db.ts still selects from it.
--
-- Nothing here touches a peek table. maps and floors are not referenced at all;
-- gadget_sites and gadget_operators are referenced, never modified.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- A setup: one bomb site, one operator, one video, many pins.
--
-- video_url is NOT NULL on purpose. Pins carry no information by themselves —
-- strip the video and a setup is a handful of dots that explain nothing. If
-- there is no clip there is no setup.
--
-- name has no default. "Setup 3" has to count the existing setups for this
-- site and operator, which is application logic; the column only insists that
-- a name exists. Free text so real R6 names ("Anti-rush") can be used later
-- without another migration.
--
-- published is per setup, so one can be drafted while another is live. The
-- site's own published flag still gates everything beneath it — see the RLS
-- policy below, which checks both.
--
-- operator_id keeps ON DELETE RESTRICT from 029: deleting an operator that
-- still has content should be refused, not silently destroy it.
-- ---------------------------------------------------------------------------
create table if not exists gadget_setups (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references gadget_sites(id)     on delete cascade,
  operator_id   uuid not null references gadget_operators(id) on delete restrict,
  name          text not null,
  display_order int  not null default 0,
  video_url     text not null,
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Tab order has to be deterministic, and this doubles as the index for the
-- public read (every setup for a site+operator, in order).
--
-- A separate statement rather than an inline table constraint: `create table
-- if not exists` skips the whole table on a re-run, so an inline constraint is
-- only ever created the first time, whereas this carries its own guard.
create unique index if not exists setups_order_idx
on gadget_setups (site_id, operator_id, display_order);

-- ---------------------------------------------------------------------------
-- Pins. Deliberately thin: coordinates and an order, nothing else.
--
-- x_pct / y_pct match the peek-pin convention (percentages of the bird's-eye
-- box) so the same rendering maths applies.
--
-- display_order drives the number drawn on the dot — the video says "first cam
-- here" and the viewer matches that to the blueprint. Indexed, not unique:
-- numbering comes from sort position, and a unique constraint would force a
-- temporary value every time two pins swap places.
-- ---------------------------------------------------------------------------
create table if not exists gadget_setup_pins (
  id            uuid primary key default gen_random_uuid(),
  setup_id      uuid not null references gadget_setups(id) on delete cascade,
  x_pct         numeric(5,2) not null check (x_pct between 0 and 100),
  y_pct         numeric(5,2) not null check (y_pct between 0 and 100),
  display_order int not null default 0
);

create index if not exists setup_pins_order_idx
on gadget_setup_pins (setup_id, display_order);

-- ---------------------------------------------------------------------------
-- RLS. Same shape as the rest of the gadget tables: public reads see published
-- rows, and there are no write policies at all, so the anon key cannot write.
-- Admin writes use the service role, which bypasses RLS.
--
-- The setup policy checks the SITE as well as the setup. Without that, a
-- published setup sitting on a draft site would be readable by anyone who
-- queried the table directly, even though no page links to it. Enforcing it
-- here rather than only in app queries is what makes "site published gates
-- everything under it" actually true.
-- ---------------------------------------------------------------------------
alter table gadget_setups     enable row level security;
alter table gadget_setup_pins enable row level security;

drop policy if exists "public read published gadget setups"  on gadget_setups;
drop policy if exists "public read pins of published setups" on gadget_setup_pins;

create policy "public read published gadget setups"
  on gadget_setups for select using (
    published = true
    and exists (
      select 1 from gadget_sites gs
      where gs.id = gadget_setups.site_id and gs.published = true
    )
  );

create policy "public read pins of published setups"
  on gadget_setup_pins for select using (
    exists (
      select 1 from gadget_setups s
      where s.id = gadget_setup_pins.setup_id and s.published = true
    )
  );

-- ---------------------------------------------------------------------------
-- Contributor credit for gadget work, matching what peeks already have.
--
-- Added now rather than later because it is one nullable column today and a
-- retrofit once submissions are flowing. The old linked_gadget_placement_id
-- from 032 stays until 035 drops it; nothing has ever written to it.
-- ---------------------------------------------------------------------------
alter table community_submissions
  add column if not exists linked_gadget_setup_id uuid
    references gadget_setups(id) on delete set null;


/* ---------------------------------------------------------------------------
   VERIFY
--------------------------------------------------------------------------- */
-- Both tables exist with RLS on and one policy each:
--
-- select relname, relrowsecurity from pg_class
--  where relname in ('gadget_setups','gadget_setup_pins');
--
-- select tablename, policyname from pg_policies
--  where tablename in ('gadget_setups','gadget_setup_pins');
--
-- The new submission column is present:
-- select column_name from information_schema.columns
--  where table_name = 'community_submissions'
--    and column_name = 'linked_gadget_setup_id';
--
-- Nothing was removed — the old table is still serving the site:
-- select count(*) from gadget_placements;   -- 24 at the time of writing
--
-- Untouched:
-- select count(*) from peeks;               -- 215 at the time of writing
