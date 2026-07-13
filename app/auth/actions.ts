"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthState } from "./types";

// Absolute origin of the current request (so emailed links point back to the
// right place on localhost and production alike).
function siteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://peekaboor6.com";
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("not confirmed") || m.includes("not been confirmed")) {
      return {
        error:
          "Please verify your email first — check your inbox for the verification link.",
        needsVerification: true,
        email,
      };
    }
    if (m.includes("invalid")) return { error: "Wrong email or password." };
    return { error: error.message };
  }
  redirect("/account");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!email || !password) return { error: "Enter an email and password." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already") || m.includes("registered")) {
      return { error: "That email is already registered. Try logging in." };
    }
    return { error: error.message };
  }
  // Supabase returns a user with no identities (instead of an error) when the
  // email is already registered — surface that as "already registered".
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      error:
        "That email is already registered. Try logging in or resetting your password.",
    };
  }
  return {
    message: "Check your email to confirm your account, then log in.",
    email,
  };
}

// Re-send the signup verification email (Supabase supports resending until the
// address is confirmed). Used by the post-signup screen and the "unverified"
// login state.
export async function resendVerificationAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already") || m.includes("confirmed")) {
      return { error: "That email is already verified — just log in.", email };
    }
    return { error: error.message, email };
  }
  return { message: "Verification email sent — check your inbox.", email };
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = createSupabaseServerClient();
  // Ignore the result on purpose — never reveal whether an email is registered.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password`,
  });
  return {
    message: "If that email has an account, we've sent a password reset link.",
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("session") || m.includes("expired") || m.includes("jwt")) {
      return {
        error:
          "Your reset link has expired. Request a new one from the forgot-password page.",
      };
    }
    return { error: error.message };
  }
  redirect("/account");
}
