import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Verifies an email link and establishes a session, then forwards to `next`.
// Preferred flow: token_hash + type via verifyOtp — stateless, no PKCE code
// verifier, so it works across devices/browsers (the reset/confirm link is
// often opened somewhere other than where it was requested). Falls back to the
// PKCE ?code exchange for any legacy links that still carry a code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  // TEMP DEBUG: surface the real failure reason. Remove after diagnosing.
  const failParams = new URLSearchParams();

  const recordError = (error: {
    message: string;
    name?: string;
    status?: number;
    code?: string;
  }) => {
    failParams.set("debug", error.message);
    failParams.set("debug_code", error.code ?? error.name ?? "unknown");
    failParams.set("debug_status", String(error.status ?? ""));
  };

  if (tokenHash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(next); // cookie-safe redirect (flushes the session)
    recordError(error);
  } else if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    recordError(error);
  } else {
    failParams.set(
      "debug",
      "no_token_hash_or_code — link had neither ?token_hash+type nor ?code (check the Supabase email template)"
    );
    failParams.set("debug_code", "missing_params");
  }

  failParams.set(
    "debug_params",
    Array.from(searchParams.keys()).join(",") || "none"
  );
  failParams.set("error", "We couldn't verify that link. It may have expired.");
  return NextResponse.redirect(`${origin}/login?${failParams.toString()}`);
}
