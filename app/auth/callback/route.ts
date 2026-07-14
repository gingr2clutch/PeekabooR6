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

  const supabase = createSupabaseServerClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(next); // cookie-safe redirect (flushes the session)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "We couldn't verify that link. It may have expired."
    )}`
  );
}
