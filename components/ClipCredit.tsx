import Link from "next/link";

// Who made this clip.
//
// Used by both the peek page and the gadget setup page so attribution reads
// identically wherever a clip appears — a contributor checking their own credit
// should not find it worded one way on one page and another way elsewhere.
//
// Sits directly under the page title. Under the player it was small, muted and
// easy to miss entirely, which defeats the point of crediting anyone. Orange
// and bold so it reads as part of the header.
//
// Always rendered, whoever it names. That is the whole reason it cannot shift
// the page: the line occupies its row from first paint, so nothing arriving
// later has anything to push down. A conditional credit line would appear only
// on some pages and move everything under it when it did.
//
// Nothing here animates, so there is no reduced-motion case to handle.

/**
 * A clip we host, with nobody credited.
 *
 * Only honest for a file on our own storage. An external clip was filmed by
 * someone on that platform, and claiming it would be a lie — see
 * EXTERNAL_CREATOR.
 */
export const HOUSE_CREDIT = "peekabooR6";

/**
 * An external clip with nobody credited by name.
 *
 * We know where it came from but not who shot it, so name the platform and
 * leave authorship with them: "the TikTok creator", "the YouTube creator".
 */
export const EXTERNAL_CREATOR = (platform: string) => `the ${platform} creator`;

/** An external clip whose host we cannot identify — an older row. */
export const UNKNOWN_CREATOR = "the original creator";

export type ClipCreditProps = {
  /** Wins outright when set: a named person beats any platform guess. */
  contributor: { display_name: string; slug: string } | null;
  /**
   * Platform name for an EXTERNAL clip, from lib/gadget-embed's classifier.
   * Null means the clip is a file we host, which is the only case the house
   * credit is honest about.
   *
   * Pass it even when the clip plays inline: embedding someone's TikTok does
   * not make it ours.
   */
  platform?: string | null;
  /** True when the clip is external but its host was not recognised. */
  externalUnknown?: boolean;
  /**
   * The noun before "by". "Peek" on a peek page, "Setup" on a gadget page — the
   * credit sits under the title, so it should name what the title names.
   */
  label?: string;
  className?: string;
};

export function ClipCredit({
  contributor,
  platform = null,
  externalUnknown = false,
  label = "Clip",
  className = "",
}: ClipCreditProps) {
  // Priority: a named contributor, then the platform it came from, then us.
  // Resolved here rather than at each call site so the pages cannot disagree
  // about precedence.
  const fallback = platform
    ? EXTERNAL_CREATOR(platform)
    : externalUnknown
      ? UNKNOWN_CREATOR
      : HOUSE_CREDIT;

  return (
    <p className={`text-center text-sm font-bold text-brand ${className}`}>
      {label} by{" "}
      {contributor ? (
        <Link
          href={`/contributors/${contributor.slug}`}
          className="underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand"
        >
          {contributor.display_name}
        </Link>
      ) : (
        // Not a link in any fallback case. There is no contributor page for the
        // house, and "the TikTok creator" is precisely the person we cannot
        // name — linking either would promise a destination we do not have.
        <span>{fallback}</span>
      )}
    </p>
  );
}
