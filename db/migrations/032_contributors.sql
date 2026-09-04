-- Contributors: the identities behind community submissions, and what the
-- leaderboard ranks.
--
-- The point of a separate table is that identity is resolved at APPROVAL, not
-- at submission. Submitting stays accountless, and the leaderboard reads these
-- rows rather than the raw submitter_name strings — which is what stops
-- impersonation and merges duplicate spellings of the same person.
--
-- No peek table is altered. Both new columns live on community_submissions.

create table if not exists contributors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  display_name text not null,
  slug         text not null unique,

  -- Set only if the contributor later claims their profile. Nullable forever
  -- otherwise: credit does not require an account.
  claimed_by   uuid references auth.users(id) on delete set null,

  avatar_url   text,
  link_url     text,
  is_hidden    boolean not null default false
);

-- Case-insensitive uniqueness WITHOUT the citext extension. "Gingr" and
-- "gingr" cannot both exist, which is the whole reason identity is resolved at
-- approval — a plain unique constraint would let both through and split one
-- person's credit across two rows.
create unique index if not exists contributors_display_name_lower_idx
  on contributors (lower(display_name));

-- Partial index: the leaderboard only ever reads visible rows.
create index if not exists contributors_visible_idx
  on contributors (id) where is_hidden = false;


/* ---------------------------------------------------------------------------
   RLS.

   In plain English: nobody reaches this table directly. Enabled with no
   policies, which denies everything to anon and authenticated alike; every
   read and write goes through the server, which holds the service role.

   This is deliberately stricter than "public read of non-hidden rows". That
   policy would also expose claimed_by — a real auth.users id — to anyone who
   asked PostgREST for it. The leaderboard and profile pages are server
   rendered, so nothing client-side needs to read this table, and the stricter
   setting costs nothing.
--------------------------------------------------------------------------- */
alter table contributors enable row level security;


/* ---------------------------------------------------------------------------
   Link submissions to contributors, and to their published result.
--------------------------------------------------------------------------- */
alter table community_submissions
  -- Nullable on purpose: submissions arrive unattributed and get attached at
  -- approval. On delete set null so removing a contributor never destroys the
  -- submission record behind it.
  add column if not exists contributor_id uuid
    references contributors(id) on delete set null,

  -- The gadget counterpart to linked_peek_id, which already exists. Without
  -- it an approved gadget submission has nowhere to point, and the contributor
  -- profile cannot link a gadget card to anything real.
  add column if not exists linked_gadget_placement_id uuid
    references gadget_placements(id) on delete set null;

-- The leaderboard's hot path: approved submissions for a contributor, of one
-- kind, inside a date window.
create index if not exists community_submissions_leaderboard_idx
  on community_submissions (contributor_id, kind, status, created_at desc);


/* ---------------------------------------------------------------------------
   VERIFY
--------------------------------------------------------------------------- */
-- Expect the columns above, rls enabled, zero policies:
--
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_name = 'contributors' order by ordinal_position;
--
-- select relrowsecurity from pg_class where relname = 'contributors';
-- select count(*) from pg_policies where tablename = 'contributors';
--
-- Both new columns present on submissions:
-- select column_name from information_schema.columns
--  where table_name = 'community_submissions'
--    and column_name in ('contributor_id','linked_gadget_placement_id');
--
-- Untouched:
-- select count(*) from peeks;   -- 214 at the time of writing
