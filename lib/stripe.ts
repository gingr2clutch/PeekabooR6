import Stripe from "stripe";

// Server-only Stripe client. Never import from a "use client" file. Uses the
// secret key (test-mode until live keys are set). Pin the API version so
// behavior doesn't shift under us when Stripe updates their default.
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY — add it to .env.local (and Vercel). See .env.local.example."
    );
  }
  client = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  return client;
}

export function stripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) {
    throw new Error(
      "Missing STRIPE_PRICE_ID — add the $2.99/mo recurring price id to .env.local (and Vercel)."
    );
  }
  return id;
}
