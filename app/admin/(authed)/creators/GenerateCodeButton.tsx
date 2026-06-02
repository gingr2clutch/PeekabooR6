"use client";

import { useState, useTransition } from "react";
import {
  generateCreatorCodeAction,
  type GenerateResult,
} from "./actions";

// Calls the server action, then shows the freshly generated code in a
// copyable pill so the admin can paste it into wherever they're DMing the
// invited creator. Subsequent generates replace the displayed code.
export function GenerateCodeButton() {
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res: GenerateResult = await generateCreatorCodeAction();
      if (res.ok) {
        setLatestCode(res.code);
      } else {
        setError(res.error);
      }
    });
  }

  async function handleCopy() {
    if (!latestCode) return;
    try {
      await navigator.clipboard.writeText(latestCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent — most browsers will succeed; fall back to manual select.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Generating…" : "+ Generate code"}
      </button>
      {latestCode && (
        <div className="inline-flex items-center gap-2 rounded-btn border border-brand/40 bg-brand/[0.06] px-3 py-1.5 text-sm">
          <span className="text-muted">New code:</span>
          <code className="select-all font-mono font-semibold text-ink">
            {latestCode}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-btn border border-border bg-card px-2 py-0.5 text-xs text-ink transition-colors hover:border-brand hover:text-brand"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
