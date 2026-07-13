import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Exchanges the one-time code from a verification / password-reset email link
// for a session (setting the auth cookies), then forwards to `next`. Used by
// both the signup confirmation link and the password-reset link.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(
    `${origin}/login?error=We%20couldn't%20verify%20that%20link.%20It%20may%20have%20expired.`
  );
}
