-- 027_pro_waitlist.sql
-- Email waitlist for the pre-launch "Pro coming soon" page. Written only by the
-- server action (service role); not read by public queries, so RLS is on with
-- no policies (service role bypasses it; anon/authenticated get nothing).

create table if not exists public.pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pro_waitlist enable row level security;

-- Refresh PostgREST's schema cache immediately so the new table is queryable
-- without a lag window.
notify pgrst, 'reload schema';
