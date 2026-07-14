import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Exchanges the one-time code from a verification / password-reset email link
// for a session (setting the auth cookies), then forwards to `next`. Used by
// both the signup confirmation link and the password-reset link.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  // TEMP DEBUG: surface the real failure reason. Remove after diagnosing.
  // `debug` = underlying Supabase error message (or a marker for the
  // no-code case), `debug_code` = its error_code, `debug_params` = the query
  // params Supabase actually sent to this callback (helps spot token_hash /
  // otp-style links that this code-exchange flow doesn't handle).
  const failParams = new URLSearchParams();

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    failParams.set("debug", error.message);
    // AuthError exposes `code` (string) on recent supabase-js; fall back to name.
    failParams.set(
      "debug_code",
      (error as { code?: string }).code ?? error.name ?? "unknown"
    );
    failParams.set("debug_status", String(error.status ?? ""));
  } else {
    failParams.set(
      "debug",
      "no_code_param — link did not include ?code (likely a token_hash/otp or hash-fragment flow this route doesn't handle)"
    );
    failParams.set("debug_code", "missing_code");
  }
  // Echo back which query keys Supabase sent (values omitted — they're secret).
  failParams.set(
    "debug_params",
    Array.from(searchParams.keys()).join(",") || "none"
  );

  failParams.set(
    "error",
    "We couldn't verify that link. It may have expired."
  );
  return NextResponse.redirect(`${origin}/login?${failParams.toString()}`);
}
