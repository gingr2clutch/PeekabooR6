import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth cookies for the current request (rotates the
// access token when it's near expiry) using the request/response cookie stores
// — the canonical @supabase/ssr middleware pattern. Returns the response whose
// Set-Cookie headers carry the refreshed session; callers must return THIS
// response so the browser receives the updated cookies.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return supabaseResponse;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: nothing between createServerClient and getUser(), per the SSR
  // guide — getUser() is what triggers the token refresh + setAll.
  await supabase.auth.getUser();

  return supabaseResponse;
}
