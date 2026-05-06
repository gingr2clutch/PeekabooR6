-- Self-hosted page view log used by /admin/live for real-time visitor stats.
-- Public site inserts via the anon role; only authenticated reads.

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  session_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_page_views_created_at
  on page_views (created_at desc);

create index if not exists idx_page_views_session_id
  on page_views (session_id);

alter table page_views enable row level security;

drop policy if exists "Anyone can insert page views" on page_views;
drop policy if exists "Authenticated can read page views" on page_views;

create policy "Anyone can insert page views"
  on page_views for insert
  to anon, authenticated
  with check (true);

create policy "Authenticated can read page views"
  on page_views for select
  to authenticated
  using (true);
