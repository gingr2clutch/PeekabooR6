-- 014_creators.sql
-- Creators feature, phase 1: a code-gated invitation system.
-- An admin generates a row with a unique `code`. All profile fields stay
-- null until the invited creator claims the code via the public signup
-- form (phase 2), at which point `claimed_at` is set and the profile
-- fields are filled. An admin later sets `approved_at` to feature the
-- creator on /creators (phase 3).
--
-- Codes are single-use: a row is "used" the moment claimed_at is non-null.
-- We don't recycle or delete consumed codes — the row stays as audit trail.
--
-- The table is admin-only. RLS is enabled with NO policies so the public
-- anon role gets nothing; server-side admin code uses the service-role
-- key (supabaseAdmin()) which bypasses RLS entirely. Same posture the
-- rest of the admin-tier data uses today.

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text,
  tiktok text,
  bio text,
  profile_image_url text,
  claimed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists creators_claimed_idx on creators (claimed_at);
create index if not exists creators_approved_idx on creators (approved_at);

alter table creators enable row level security;

notify pgrst, 'reload schema';
