"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client — cookie-backed via @supabase/ssr, so the server
// reads the same session. Auto-refreshes the access token while any page is
// open, keeping logins alive across the site without a per-request server call.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
