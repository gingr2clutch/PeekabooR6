import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cookie-aware Supabase client for the App Router — server components, server
// actions, and route handlers. Use this for anything auth/session-related.
// The plain supabasePublic()/supabaseAdmin() in lib/supabase.ts stay as-is for
// data queries; this is additive.
export function createSupabaseServerClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.local.example."
    );
  }
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component (cookies are read-only there).
          // Safe to ignore — session writes happen in server actions / route
          // handlers, and the browser client keeps the token fresh.
        }
      },
    },
  });
}
