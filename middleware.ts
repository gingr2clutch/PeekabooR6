import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieIsValid } from "@/lib/admin-auth";
import { updateSession } from "@/lib/supabase/middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolves /peeks/<uuid> → /peeks/<slug> with a true HTTP 308 before any
// response stream starts, so search engines see a clean redirect instead
// of the 200 + meta-refresh that next/navigation's permanentRedirect
// falls back to when invoked from inside a Server Component.
async function redirectPeekUuid(
  req: NextRequest,
  uuid: string
): Promise<NextResponse | null> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!sbUrl || !anonKey) return null;
  try {
    const r = await fetch(
      `${sbUrl}/rest/v1/peeks?id=eq.${uuid}&select=slug,published&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as {
      slug: string;
      published: boolean;
    }[];
    const hit = rows[0];
    if (!hit?.slug || !hit.published) return null;
    const url = req.nextUrl.clone();
    url.pathname = `/peeks/${hit.slug}`;
    return NextResponse.redirect(url, 308);
  } catch {
    // Network blip or RLS change — fall through so the page's existing
    // meta-refresh fallback still serves users.
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // /peeks/<uuid> → 308 to slug. Slug paths skip after the regex test.
  const peekMatch = path.match(/^\/peeks\/([^/]+)$/);
  if (peekMatch) {
    if (UUID_RE.test(peekMatch[1])) {
      const redirect = await redirectPeekUuid(req, peekMatch[1]);
      if (redirect) return redirect;
    }
    return NextResponse.next();
  }

  // /admin/* auth gate — subpaths only (the /admin login page stays open).
  if (path.startsWith("/admin/")) {
    const password = process.env.ADMIN_PASSWORD;
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;

    if (!password) {
      const url = new URL("/admin", req.url);
      url.searchParams.set("error", "missing-config");
      return NextResponse.redirect(url);
    }

    if (!(await cookieIsValid(cookie, password))) {
      const url = new URL("/admin", req.url);
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Admin area uses its own cookie; no Supabase session refresh needed.
    return NextResponse.next();
  }

  // Refresh the Supabase auth cookies, but ONLY when a session cookie is
  // present — anonymous pageviews (most of the traffic) skip the auth call and
  // stay fast.
  const hasSupabaseCookie = req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (hasSupabaseCookie) {
    return updateSession(req);
  }

  return NextResponse.next();
}

// Runs on every page except Next internals and static assets. The peek-uuid
// redirect and /admin gate are guarded by path checks inside; every other path
// falls through to the (cookie-gated) Supabase session refresh.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
