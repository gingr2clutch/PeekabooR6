import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Add it to .env.local — see .env.local.example.`
    );
  }
  return value;
}

// Bypass Next's fetch cache for every Supabase request. Otherwise stale dev
// caches and the App Router's default fetch caching can return empty results
// even after data changes.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

// Browser-safe client. Uses the public anon key.
export function supabasePublic(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", url),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey),
    { global: { fetch: noStoreFetch } }
  );
}

// Server-only client with full privileges. Never import from a "use client" file.
export function supabaseAdmin(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", url),
    required("SUPABASE_SERVICE_ROLE_KEY", serviceKey),
    {
      auth: { persistSession: false },
      global: { fetch: noStoreFetch },
    }
  );
}
