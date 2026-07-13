"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  signInAction,
  signUpAction,
  requestPasswordResetAction,
  updatePasswordAction,
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

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(
    signInAction,
    initialError ? { error: initialError } : EMPTY
  );
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
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
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
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
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
      />
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
