-- peekabooR6 schema. Paste this entire file into the Supabase SQL editor
-- (Project → SQL Editor → New query) and run it once.

create extension if not exists pgcrypto;

-- The 14 ranked maps.
create table if not exists maps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  published boolean not null default false,
  cover_image_url text,
  created_at timestamptz default now()
);

-- Each map has multiple floors. Floor lists differ per map.
create table if not exists floors (
  id uuid primary key default gen_random_uuid(),
  map_id uuid references maps(id) on delete cascade,
  slug text not null,
  name text not null,
  display_order int not null,
  birds_eye_url text,
  created_at timestamptz default now(),
  unique (map_id, slug)
);

create index if not exists floors_map_order_idx
  on floors (map_id, display_order);

-- Spawn peeks pinned to specific floors.
create table if not exists peeks (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references floors(id) on delete cascade,
  name text not null,
  x_pct real not null,
  y_pct real not null,
  video_url text,
  poster_url text,
  instructions jsonb,
  difficulty int default 3,
  risk text default 'medium',
  tip text,
  useful_pct int default 0,
  vote_count int default 0,
  success_rate int not null default 50 check (success_rate between 0 and 100),
  view_count int not null default 0,
  published boolean default false,
  created_at timestamptz default now()
);

create index if not exists peeks_published_floor_idx
  on peeks (floor_id) where published = true;

-- Row-level security. The public site uses the anon key and only reads.
-- Admin writes use the service-role key, which bypasses RLS.
alter table maps   enable row level security;
alter table floors enable row level security;
alter table peeks  enable row level security;

drop policy if exists "public read maps"            on maps;
drop policy if exists "public read floors"          on floors;
drop policy if exists "public read published peeks" on peeks;

create policy "public read maps"
  on maps for select using (true);

create policy "public read floors"
  on floors for select using (true);

create policy "public read published peeks"
  on peeks for select using (published = true);
