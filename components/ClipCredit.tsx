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

/**
 * Who to name for a clip, as plain text.
 *
 * Extracted so the floor page's spot list resolves credits through the exact
 * same precedence the peek page renders — a contributor should never find
 * themselves credited one way on a peek page and another way in a pin list.
 */
export function clipCreditName({
  contributor,
  platform = null,
  externalUnknown = false,
}: {
  contributor: { display_name: string; slug: string } | null;
  platform?: string | null;
  externalUnknown?: boolean;
}): string {
  if (contributor) return contributor.display_name;
  if (platform) return EXTERNAL_CREATOR(platform);
  if (externalUnknown) return UNKNOWN_CREATOR;
  return HOUSE_CREDIT;
}

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
  /**
   * Type size. "sm" is what every surface used before and stays the default;
   * the peek page asks for "lg", where the title is now 36/60px and 14px read
   * as a caption under it rather than as part of the header.
   */
  size?: "sm" | "lg";
  className?: string;
};

export function ClipCredit({
  contributor,
  platform = null,
  externalUnknown = false,
  label = "Clip",
  size = "sm",
  className = "",
}: ClipCreditProps) {
  // Precedence lives in clipCreditName so every surface agrees. Only the
  // no-contributor branch needs it here — a named contributor renders as a
  // link, which is markup this helper cannot return.
  const fallback = clipCreditName({ contributor: null, platform, externalUnknown });

  return (
    <p
      className={`text-center font-bold text-brand ${
        size === "lg" ? "text-base sm:text-lg" : "text-sm"
      } ${className}`}
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
        // Not a link in any fallback case. There is no contributor page for the
        // house, and "the TikTok creator" is precisely the person we cannot
        // name — linking either would promise a destination we do not have.
        <span>{fallback}</span>
      )}
    </p>
  );
}
