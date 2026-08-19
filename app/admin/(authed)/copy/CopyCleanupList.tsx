"use client";

import { useState } from "react";
import Link from "next/link";
import {
  updatePeekFieldAction,
  type InlineField,
} from "../peeks/actions";

export type CopyRow = {
  id: string;
  slug: string;
  name: string;
  mapName: string;
  floorName: string;
  instructions: string; // one step per line
  tip: string;
};

type FieldState = "idle" | "saving" | "saved" | "error";

const inputCls =
  "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-brand";

function statusLabel(state: FieldState, error: string | null) {
  if (state === "saving") return { text: "Saving…", cls: "text-muted" };
  if (state === "saved") return { text: "Saved", cls: "text-teal" };
  if (state === "error") return { text: error ?? "Failed", cls: "text-brand" };
  return null;
}

// One editable field. Saves on blur when the value actually changed, so
// scrolling past a peek you didn't touch writes nothing. The Save button is
// there for keyboard users and for anyone who wants an explicit commit.
function Field({
  peekId,
  field,
  label,
  hint,
  initial,
  rows,
}: {
  peekId: string;
  field: Extract<InlineField, "instructions" | "tip">;
  label: string;
  hint: string;
  initial: string;
  rows: number;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<FieldState>("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== saved;

  async function commit() {
    if (!dirty || state === "saving") return;
    setState("saving");
    setError(null);
    const res = await updatePeekFieldAction(peekId, field, value);
    if (res.ok) {
      // Trust the server's normalized value — it has trimmed lines, dropped
      // blanks and applied the 200-char tip cap, so the box shows exactly what
      // is stored rather than what was typed.
      const next = String(res.value ?? "");
      setValue(next);
      setSaved(next);
      setState("saved");
      window.setTimeout(() => setState("idle"), 1600);
    } else {
      setError(res.error);
      setState("error");
    }
  }

  const status = statusLabel(state, error);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {status && (
            <span className={`text-xs ${status.cls}`}>{status.text}</span>
          )}
          {dirty && state !== "saving" && (
            <span className="text-xs text-muted">Unsaved</span>
          )}
          <button
            type="button"
            onClick={commit}
            disabled={!dirty || state === "saving"}
            className="rounded-btn border border-border px-2 py-0.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink"
          >
            Save
          </button>
        </div>
      </div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        spellCheck
        className={inputCls}
      />
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

export function CopyCleanupList({ rows }: { rows: CopyRow[] }) {
  return (
    <div className="space-y-8">
      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-card border border-border bg-card p-4 sm:p-5"
        >
          <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{r.name}</h2>
              <p className="text-xs text-muted">
                {r.mapName} · {r.floorName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <Link
                href={`/admin/peeks/${r.id}/edit`}
                className="text-muted underline-offset-2 hover:text-brand hover:underline"
              >
                Full edit
              </Link>
              <Link
                href={`/peeks/${r.slug}`}
                target="_blank"
                rel="noopener"
                className="text-muted underline-offset-2 hover:text-brand hover:underline"
              >
                View →
              </Link>
            </div>
          </header>

          <div className="space-y-4">
            <Field
              peekId={r.id}
              field="instructions"
              label="Instructions"
              hint="One step per line. Blank lines are dropped on save."
              initial={r.instructions}
              rows={Math.min(10, Math.max(3, r.instructions.split("\n").length))}
            />
            <Field
              peekId={r.id}
              field="tip"
              label="Tip"
              hint="Max 200 characters — anything longer is truncated on save."
              initial={r.tip}
              rows={2}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
