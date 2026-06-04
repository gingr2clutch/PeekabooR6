-- 017_creators_manage_token.sql
-- Creators feature, phase 6: self-serve manage link.
-- Each creator gets a long random URL-safe token. The /manage/<token>
-- route lets them edit their profile fields without an account — the
-- token IS the credential. It's never exposed in any public read path.
--
-- Backfill assigns a token to every existing row (claimed or not) so
-- the unique index can be plain rather than partial. 24 random bytes
-- → 48 hex chars → 192 bits of entropy, collision-resistant for any
-- plausible creator count.
--
-- Column stays nullable so the existing admin code-generation flow
-- (inserts a row with just `code`) keeps working — claim mints the
-- token at claim time and overwrites whatever was backfilled.

alter table creators
  add column if not exists manage_token text;

update creators
  set manage_token = encode(gen_random_bytes(24), 'hex')
  where manage_token is null;

create unique index if not exists creators_manage_token_idx
  on creators (manage_token);

notify pgrst, 'reload schema';
