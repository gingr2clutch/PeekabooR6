"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinWaitlistAction, type WaitlistState } from "@/app/pro/actions";

const EMPTY: WaitlistState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity] duration-150 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding…" : "Notify me when Pro launches"}
    </button>
  );
}

// Pre-launch email capture. Prefills the address when the visitor is logged in.
export function WaitlistForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action] = useFormState(joinWaitlistAction, EMPTY);

  if (state.message) {
    return (
      <div className="rounded-btn border border-teal/40 bg-teal/10 px-3 py-2.5 text-center text-sm text-teal">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      {state.error && (
        <div className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <input
        name="email"
        type="email"
        required
        defaultValue={defaultEmail}
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-teal focus:ring-2 focus:ring-teal/25"
      />
      <SubmitButton />
    </form>
  );
}
