import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieIsValid } from "@/lib/admin-auth";

export async function middleware(req: NextRequest) {
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

  return NextResponse.next();
}

// Protect every /admin/* path except /admin itself (the login page).
export const config = {
  matcher: ["/admin/:path+"],
};
