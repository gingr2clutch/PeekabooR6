import Link from "next/link";

// Who filmed this clip.
//
// Used by both the peek page and the gadget setup page so attribution reads
// identically wherever a clip appears — a contributor checking their own credit
// should not find it worded one way on one page and another way elsewhere.
//
// Always rendered, including when nobody is credited. That is the whole reason
// it cannot shift the page: the line occupies its row from first paint, so the
// video arriving later has nothing to push down. A conditional credit line
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
  className?: string;
};

export function ClipCredit({ contributor, className = "" }: ClipCreditProps) {
  return (
    <p className={`text-center text-xs text-muted ${className}`}>
      Clip by{" "}
      {contributor ? (
        <Link
          href={`/contributors/${contributor.slug}`}
          className="font-medium text-ink underline decoration-border underline-offset-2 transition-colors hover:text-blue hover:decoration-blue"
        >
          {contributor.display_name}
        </Link>
      ) : (
        // Deliberately not a link. There is no contributor page for the house,
        // and linking it somewhere generic would invite a click that goes
        // nowhere useful.
        <span className="font-medium text-ink">{HOUSE_CREDIT}</span>
      )}
    </p>
  );
}
