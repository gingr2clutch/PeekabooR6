"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  expectedCookieValue,
} from "@/lib/admin-auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/maps") || "/admin/maps";

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    redirect("/admin?error=missing-config");
  }
  if (password !== expected) {
    redirect("/admin?error=bad-password");
  }

  cookies().set(ADMIN_COOKIE, await expectedCookieValue(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  // Only allow redirects back into our own /admin area.
  const safeNext = next.startsWith("/admin/") ? next : "/admin/maps";
  redirect(safeNext);
}

export async function logoutAction() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin");
}
