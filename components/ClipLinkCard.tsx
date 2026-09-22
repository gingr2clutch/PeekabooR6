// The click-out card for a clip we do not frame.
//
// It fills the same aspect-video box the iframe would, so the page reserves an
// identical height whichever kind of clip a setup has and switching between
// setups cannot reflow. Nothing here loads asynchronously — the play mark is an
// inline SVG and the platform is a string, so the card is complete on first
// paint and contributes no layout shift.
//
// Deliberately no thumbnail. Pulling a poster from TikTok or YouTube at render
// time would mean an external image request per card, which is a third-party
// round trip, a tracking surface, and something that can fail or resize after
// paint. The card is self-contained instead.
//
// It should read as a deliberate destination, not as an apology for a broken
// player — hence a real label naming the platform rather than "this clip could
// not be embedded".

import type { ClipAspect } from "@/lib/gadget-embed";

export function ClipLinkCard({
  href,
  platform,
  aspect = "video",
}: {
  href: string;
  /** "TikTok", "YouTube", … — comes from the allowlist in lib/gadget-embed. */
  platform: string;
  /** Matches the box an embed of the same platform would have taken. */
  aspect?: ClipAspect;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex w-full flex-col items-center justify-center gap-3 bg-card px-4 text-center ${
        aspect === "portrait" ? "aspect-[9/16]" : "aspect-video"
      }`}
    >
      {/* Play affordance. motion-safe so the scale is dropped entirely for
          anyone who asked for reduced motion, and it is a transform, so it
          cannot shift anything around it. */}
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-blue/40 bg-blue/10 transition-transform duration-200 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-blue">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>

      <span className="block">
        <span className="block text-base font-semibold text-ink">
          Watch on {platform}
          <span aria-hidden="true"> →</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          Opens {platform} in a new tab
        </span>
      </span>
    </a>
  );
}
