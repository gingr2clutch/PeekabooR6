-- 021_fix_posted_to_discord_drafts.sql
-- Corrects the 020 backfill. 020 set posted_to_discord = true for EVERY peek,
-- including unpublished drafts, so publishing a pre-existing draft never fired
-- the #new-peeks webhook (postPeekToDiscord's atomic claim requires
-- posted_to_discord = false). Drafts should announce when they go live, so
-- reset every not-yet-published peek to false. Already-published peeks stay
-- true so the existing live library is never announced retroactively.

update peeks set posted_to_discord = false where published = false;

notify pgrst, 'reload schema';
