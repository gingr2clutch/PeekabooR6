import Link from "next/link";

// Who filmed this clip.
//
// Used by both the peek page and the gadget setup page so attribution reads
// identically wherever a clip appears — a contributor checking their own credit
// should not find it worded one way on one page and another way elsewhere.
//
// Sits directly under the page title, not under the clip — down there it was
// small, muted and easy to miss entirely, which defeats the point of crediting
// anyone. Orange and bold so it reads as part of the header.
//
// Always rendered, including when nobody is credited. That is the whole reason
// it cannot shift the page: the line occupies its row from first paint, so
// nothing arriving later has anything to push down. A conditional credit line
// would appear only on some pages and move everything under it when it did.
//
// Nothing here animates, so there is no reduced-motion case to handle.

/**
 * What an uncredited clip is attributed to.
 *
 * The single copy of this string. Both pages import it from here rather than
 * writing "peekabooR6" inline, so the day it becomes a brand name or a handle
 * it changes in one place.
 */
export const HOUSE_CREDIT = "peekabooR6";

export type ClipCreditProps = {
  /** Null when nobody is credited — renders the house fallback, unlinked. */
  contributor: { display_name: string; slug: string } | null;
  /**
   * The noun before "by". "Peek" on a peek page, "Setup" on a gadget page —
   * the credit sits under the title there, so it should name what the title
   * names rather than always saying "Clip".
   */
  label?: string;
  className?: string;
};

export function ClipCredit({
  contributor,
  label = "Clip",
  className = "",
}: ClipCreditProps) {
  return (
    <p
      className={`text-center text-sm font-bold text-brand ${className}`}
    >
      {label} by{" "}
      {contributor ? (
        <Link
          href={`/contributors/${contributor.slug}`}
          className="underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand"
        >
          {contributor.display_name}
        </Link>
      ) : (
        // Deliberately not a link. There is no contributor page for the house,
        // and linking it somewhere generic would invite a click that goes
        // nowhere useful.
        <span>{HOUSE_CREDIT}</span>
      )}
    </p>
  );
}
