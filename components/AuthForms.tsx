"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import {
  signInAction,
  signUpAction,
  requestPasswordResetAction,
  updatePasswordAction,
  resendVerificationAction,
} from "@/app/auth/actions";
import type { AuthState } from "@/app/auth/types";

const EMPTY: AuthState = {};

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-teal focus:ring-2 focus:ring-teal/25"
      />
    </label>
  );
}

// Password input with a show/hide eye toggle (tap-friendly on mobile).
function PasswordField({
  label,
  name,
  autoComplete,
}: {
  label: string;
  name: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className="w-full rounded-btn border border-border bg-bg px-3 py-2 pr-11 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-teal focus:ring-2 focus:ring-teal/25"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-ink"
        >
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity] duration-150 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-teal/40 bg-teal/10 text-teal";
  return (
    <div className={`rounded-btn border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

// Small "resend verification email" form — a hidden email + a link-style
// submit that shows its own pending/result state.
function ResendVerification({
  email,
  label,
}: {
  email: string;
  label: string;
}) {
  const [state, action] = useFormState(resendVerificationAction, EMPTY);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <ResendButton>{label}</ResendButton>
    </form>
  );
}

function ResendButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium text-brand hover:underline disabled:opacity-60"
    >
      {pending ? "Sending…" : children}
    </button>
  );
}

// Post-signup confirmation screen.
function CheckEmailPanel({ email }: { email: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
        <MailCheck size={24} aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold text-ink">Check your email</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          We sent a verification link to{" "}
          <span className="font-medium text-ink">{email}</span>. Click it to
          activate your account.
        </p>
      </div>
      <div className="rounded-card border border-border bg-bg/60 p-3">
        <p className="mb-1 text-xs text-muted">Didn&rsquo;t get it?</p>
        <ResendVerification email={email} label="Resend verification email" />
      </div>
      <p className="text-sm text-muted">
        <Link href="/login" className="hover:text-brand">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(
    signInAction,
    initialError ? { error: initialError } : EMPTY
  );
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.needsVerification && state.email && (
        <ResendVerification
          email={state.email}
          label="Resend verification email"
        />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
      />
      <SubmitButton>Log in</SubmitButton>
      <div className="flex items-center justify-between pt-1 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-brand">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create account
        </Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useFormState(signUpAction, EMPTY);

  // Success → swap the form for the "check your email" screen.
  if (state.message && state.email) {
    return <CheckEmailPanel email={state.email} />;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm password"
        name="confirm"
        autoComplete="new-password"
      />
      <SubmitButton>Create account</SubmitButton>
      <p className="pt-1 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState(requestPasswordResetAction, EMPTY);
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <SubmitButton>Send reset link</SubmitButton>
      <p className="pt-1 text-center text-sm text-muted">
        <Link href="/login" className="hover:text-brand">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useFormState(updatePasswordAction, EMPTY);
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
      />
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
