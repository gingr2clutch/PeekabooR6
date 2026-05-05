"use client";

import { useState } from "react";

type Props = {
  initial: string[];
};

// Editable numbered list. Each input ships under name="instructions" so the
// server action can pull the full list with formData.getAll("instructions").
export function InstructionsEditor({ initial }: Props) {
  const [steps, setSteps] = useState<string[]>(
    initial.length > 0 ? initial : [""]
  );

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-6 select-none pt-2 text-sm text-muted">
            {i + 1}.
          </span>
          <input
            name="instructions"
            value={step}
            onChange={(e) =>
              setSteps(steps.map((s, j) => (j === i ? e.target.value : s)))
            }
            placeholder={`Step ${i + 1}`}
            className="flex-1 rounded-btn border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => {
              const next = steps.filter((_, j) => j !== i);
              setSteps(next.length ? next : [""]);
            }}
            className="rounded-btn border border-border bg-card px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSteps([...steps, ""])}
        className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
      >
        + Add step
      </button>
    </div>
  );
}
