-- 020_peeks_posted_to_discord.sql
-- Idempotency flag for the Discord #new-peeks webhook. When a peek is first
-- published, postPeekToDiscord (lib/discord.ts) atomically flips this flag and
-- posts the peek exactly once. The atomic claim (update ... where
-- posted_to_discord = false) makes it race/retry/redeploy safe.
--
-- Backfill every EXISTING peek to true so the webhook only ever fires for
-- peeks published AFTER this migration — never retroactively for the current
-- library.

alter table peeks
  add column if not exists posted_to_discord boolean not null default false;

update peeks set posted_to_discord = true where posted_to_discord = false;

notify pgrst, 'reload schema';
