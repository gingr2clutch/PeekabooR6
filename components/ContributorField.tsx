"use client";

import { useId, useState } from "react";
import type { Contributor } from "@/lib/contributors";

type Props = {
  contributors: Contributor[];
  /** Prefill — normally the submitter's self-reported name. */
  defaultValue?: string;
  /** Rendered above the input. */
  label?: string;
};

// The contributor name input, plus a live read of what saving will actually do.
//
// One free-text field rather than a select-or-create pair: on a phone, a native
// select and a text input side by side is two taps and a decision about which
// one to use, when the admin already knows the name they want. The datalist
// gives the existing names as suggestions without taking the field away.
//
// The consequence of free text is that a typo silently creates a second
// contributor, which is precisely the split-credit problem the table exists to
// prevent. So the component says, before submission, which of the two outcomes
// is queued up — matching the same case-insensitive rule the server applies.
export function ContributorField({
  contributors,
  defaultValue = "",
  label = "Credit this to",
}: Props) {
  const [value, setValue] = useState(defaultValue);
  // The queue renders one of these per card, and a datalist is addressed by id.
  // A shared literal id would mean every field on the page pointed at the first
  // card's list — same options today, but silently wrong the moment they differ.
  const listId = useId();

  const trimmed = value.trim().replace(/\s+/g, " ");
  const match = contributors.find(
    (c) => c.display_name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        name="contributor_name"
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Their name"
        autoComplete="off"
        maxLength={60}
        className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
      />
      <datalist id={listId}>
        {contributors.map((c) => (
          <option key={c.id} value={c.display_name} />
        ))}
      </datalist>

      <span className="mt-1 block text-[11px]">
        {!trimmed ? (
          <span className="text-muted">
            Leave empty to publish without credit.
          </span>
        ) : match ? (
          <span className="text-teal">
            Existing contributor — /contributors/{match.slug}
          </span>
        ) : (
          <span className="text-brand">
            New contributor. Check the spelling: a typo here splits their credit
            into two people.
          </span>
        )}
      </span>
    </label>
  );
}
