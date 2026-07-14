-- 026_peeks_pro_only.sql
-- Mark a peek as Pro-only. Such peeks stay visible in listings (so free users
-- see there's premium content), but the detail — video/image, map position,
-- instructions/tip — is gated behind profiles.is_pro. Default false = every
-- existing peek stays free.

alter table public.peeks
  add column if not exists is_pro_only boolean not null default false;
