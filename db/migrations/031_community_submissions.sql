-- Community clip submissions: the "submit a spot" sections on the homepage
-- and the gadgets landing page.
--
-- Deliberately a NEW table. peek_submissions already exists, has rows, and is
-- read by /admin/submissions — none of that is touched here, and the two
-- flows stay independent.
--
-- No peek table is altered. linked_peek_id references peeks(id), but the
-- constraint lives on this table; peeks itself is read-only throughout.

create table if not exists community_submissions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  kind           text not null check (kind in ('peek', 'gadget')),

  -- Free text rather than FKs: a submitter can name a map or a bomb site that
  -- is not in the database yet (that is the point of "first find"). Resolving
  -- these to real rows happens at approval, in phase 2.
  map            text not null,
  bomb_site      text,
  operator       text,
  spot_name      text not null,
  is_new_spot    boolean not null default false,

  submitter_name text not null,

  -- One of these must be present; the constraint below makes step 1's "file
  -- OR link" a database rule rather than only a client-side check.
  source_url     text,
  file_path      text,

  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),

  -- Set only at approval, in phase 2. On delete set null so removing a peek
  -- never destroys the submission record behind it.
  linked_peek_id uuid references peeks(id) on delete set null,

  -- Hashed, never the raw address: it is only ever compared for the per-IP
  -- rate limit, so storing the address itself would be personal data with no
  -- extra use.
  ip_hash        text,

  constraint community_submissions_needs_media
    check (source_url is not null or file_path is not null)
);

-- The admin queue reads pending-first, newest-first.
create index if not exists community_submissions_status_created_idx
  on community_submissions (status, created_at desc);

-- Backs the 5-per-hour rate-limit count.
create index if not exists community_submissions_ip_hash_created_idx
  on community_submissions (ip_hash, created_at desc);


/* ---------------------------------------------------------------------------
   RLS. Enabled with NO policies, which denies everything to anon and
   authenticated alike.

   In plain English: nobody reaches this table directly. Every insert goes
   through the server route, which holds the service role and therefore
   bypasses RLS. That is on purpose — the route is where the rate limit runs
   and where the uploaded object is verified. An anonymous INSERT policy would
   let anyone POST straight to PostgREST and skip both, which is why there
   isn't one. Reads are admin-only for the same reason: no public read path
   exists at all.
--------------------------------------------------------------------------- */
alter table community_submissions enable row level security;


/* ---------------------------------------------------------------------------
   Private storage bucket.

   The limits are set on the bucket itself, not just in the route, so a client
   that lies about type or size is rejected by storage regardless of what the
   app believes. 104857600 bytes = 100 MB. 'mov' is video/quicktime.

   public = false: objects are unreadable without a signed URL, which the
   admin page mints per view.
--------------------------------------------------------------------------- */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  104857600,
  array['video/mp4', 'video/quicktime', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies either, for the same reason as the table: uploads use a
-- signed upload URL minted server-side, and the admin previews use signed
-- read URLs. Neither path needs an anon policy.


/* ---------------------------------------------------------------------------
   VERIFY
--------------------------------------------------------------------------- */
-- Expect the columns above, rls enabled, and zero policies:
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_name = 'community_submissions' order by ordinal_position;
--
-- select relrowsecurity from pg_class where relname = 'community_submissions';
-- select count(*) from pg_policies where tablename = 'community_submissions';
--
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'submissions';
--
-- Untouched, still there:
-- select count(*) from peek_submissions;
