"use client";

import { useState, useTransition } from "react";
import {
  claimCodeAction,
  validateCodeAction,
  type ValidateResult,
  type ClaimResult,
} from "@/app/claim/actions";

type Step = "code" | "profile";
type Status = "idle" | "submitting" | "success";

export function ClaimForm() {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [validatedCode, setValidatedCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [bio, setBio] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Enter your code.");
      return;
    }
    startTransition(async () => {
      const res: ValidateResult = await validateCodeAction(trimmed);
      if (res.ok) {
        setValidatedCode(res.code);
        setStep("profile");
      } else {
        setCodeError(res.error);
      }
    });
  }

  function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClaimError(null);
    if (!displayName.trim() || !tiktok.trim()) {
      setClaimError("Display name and TikTok handle are required.");
      return;
    }
    setStatus("submitting");
    startTransition(async () => {
      const res: ClaimResult = await claimCodeAction({
        code: validatedCode,
        display_name: displayName,
        tiktok,
        bio,
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("idle");
        setClaimError(res.error);
      }
    });
  }

  if (status === "success") {
    return (
      <div className="rounded-card border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-ink">
          Thanks — you&apos;re pending review.
        </h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll feature you on the Creators page once we&apos;ve checked
          your details. No further action needed on your end.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";
  const labelCls = "block text-xs text-muted";
  const cardCls =
    "space-y-5 rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]";
  const submitting = pending || status === "submitting";

  if (step === "code") {
    return (
      <form onSubmit={handleCodeSubmit} className={cardCls}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Step 1 of 2
        </p>
        <label className={labelCls}>
          <span className="mb-1 block">Creator code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="e.g. K7M9PXAB"
            className={`${inputCls} font-mono uppercase tracking-wider`}
            aria-invalid={codeError ? "true" : undefined}
          />
          {codeError && (
            <span className="mt-1 block text-[11px] text-red-600">
              {codeError}
            </span>
          )}
        </label>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Continue →"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleClaimSubmit} className={cardCls}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Step 2 of 2
        </p>
        <span className="rounded-btn border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Code accepted
        </span>
      </div>

      <label className={labelCls}>
        <span className="mb-1 block">Display name *</span>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="How you want to appear on the Creators page"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">TikTok handle *</span>
        <input
          type="text"
          required
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
          maxLength={32}
          placeholder="@yourhandle (the @ is optional)"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="A short intro — playstyle, rank, what you post. Optional."
          className={`${inputCls} resize-y`}
        />
        <span className="mt-1 block text-[11px] text-muted">
          Up to 500 characters.
        </span>
      </label>

      {claimError && (
        <p className="text-sm text-red-600" role="alert">
          {claimError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">* required</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Claim my code"}
        </button>
      </div>
    </form>
  );
}
