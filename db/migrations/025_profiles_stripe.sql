-- 025_profiles_stripe.sql
-- Link a Supabase user's profile to its Stripe customer so the webhook can map
-- Stripe events back to the user, and so resubscribing reuses the same customer
-- (no duplicates). is_pro (from 022) stays the source of truth for Pro access;
-- the webhook flips it. Nullable + unique: users without a subscription simply
-- have no customer id.

alter table public.profiles
  add column if not exists stripe_customer_id text unique;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);
