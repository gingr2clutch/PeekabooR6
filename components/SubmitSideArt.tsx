import Image from "next/image";
import { coverThumb } from "@/lib/cover-image";

// Decorative side panels for the homepage submit form, xl and up.
//
// The form is 620px in a shell that is well over 1000px wide at xl, which left
// two wide empty margins. These fill them with the two ways a clip actually
// arrives — a phone that already has it posted, and a PC it can be dragged
// from — so the space answers "what counts as a clip?" instead of sitting
// blank.
//
// Entirely decorative: aria-hidden, no links, nothing focusable, no text a
// reader needs. A server component with no state and no fetches — the phone's
// screen reuses a map cover the homepage grid has already loaded.
//
// All motion is one 6s loop of transform and opacity only, held paused until
// the section is revealed (see .csa-anim in globals.css, which hangs off the
// site's existing reveal observer rather than adding a second one).

// Both variants are the same art; only the accent moves. Driving it from CSS
// variables set on each panel's root keeps this ONE copy of the markup — a
// duplicated gadget version would drift the moment either one is touched.
//
// Peek values are the brand orange and peach the art already used, so "peek"
// renders byte-for-byte what it did before this prop existed.
const ACCENTS = {
  peek: {
    "--csa-accent": "#f2640e",
    "--csa-accent-wash": "rgba(242, 100, 14, 0.16)",
    "--csa-accent-trail": "rgba(242, 100, 14, 0.85)",
    "--csa-ok": "#ffb07a",
  },
  gadget: {
    // GADGET_SUBMIT.accent, with a light blue where the peek art uses peach.
    "--csa-accent": "#2e6f96",
    "--csa-accent-wash": "rgba(46, 111, 150, 0.18)",
    "--csa-accent-trail": "rgba(46, 111, 150, 0.85)",
    "--csa-ok": "#9ad2f0",
  },
} as const;

export function SubmitSideArt({
  side,
  kind = "peek",
  coverUrl,
  mapName,
}: {
  side: "phone" | "pc";
  /** Which form this art sits beside. Only the accent colour changes. */
  kind?: keyof typeof ACCENTS;
  /** Phone only: a map cover already fetched for the grid above. */
  coverUrl?: string | null;
  /** Phone only: names the clip in the overlay. */
  mapName?: string;
}) {
  const accent = ACCENTS[kind] as React.CSSProperties;
  if (side === "phone") {
    const src = coverUrl ? coverThumb(coverUrl, 400) : null;
    return (
      <div
        aria-hidden="true"
        style={accent}
        className="hidden text-center xl:block xl:translate-y-[67px]"
      >
        <div className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-muted">
          Already posted it?
        </div>
        <div className="csa-anim csa-float mx-auto mt-4 aspect-[168/336] w-full max-w-[168px] rounded-[30px] bg-[#111] p-2 shadow-[0_16px_32px_rgba(30,33,29,0.25)]">
          <div className="relative h-full w-full overflow-hidden rounded-[23px] bg-[#222]">
            {src ? (
              // Lazy, and the whole panel is display:none below xl — a lazy
              // image with no box never comes near the viewport, so narrow
              // screens never download it.
              <span className="csa-anim csa-zoom absolute inset-0 block">
                <Image
                  src={src}
                  alt=""
                  aria-hidden
                  fill
                  sizes="168px"
                  loading="lazy"
                  className="object-cover object-[62%_center]"
                />
              </span>
            ) : (
              // No cover for this map — a dark gradient rather than an empty
              // black rectangle.
              <span className="absolute inset-0 block bg-gradient-to-b from-[#3a3d36] to-[#16180f]" />
            )}
            <span className="absolute inset-0 block bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Right rail. The top circle pops and fills orange near the end
                of the loop — the "someone liked it" beat. */}
            <span className="absolute bottom-[62px] right-2.5 flex flex-col gap-3">
              <span className="csa-anim csa-pop relative block h-[26px] w-[26px] rounded-full bg-white/20">
                <span className="csa-anim csa-fill absolute inset-0 block rounded-full bg-[var(--csa-accent)] opacity-0" />
              </span>
              <span className="block h-[26px] w-[26px] rounded-full bg-white/20" />
              <span className="block h-[26px] w-[26px] rounded-full bg-white/20" />
            </span>

            <span className="csa-anim csa-playfade absolute left-1/2 top-[44%] -ml-[22px] -mt-[22px] grid h-11 w-11 place-items-center rounded-full bg-black/45">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>

            <span className="absolute inset-x-3 bottom-3.5 block text-left text-[11px] text-white">
              <b className="block text-[12px]">@you</b>
              {mapName ? `${mapName} spawn peek` : "spawn peek"}
              <span className="mt-2 block h-[3px] overflow-hidden rounded-[3px] bg-white/35">
                <span className="csa-anim csa-prog block h-full w-full origin-left bg-white" />
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {["TikTok", "YouTube", "Medal"].map((c) => (
            <span
              key={c}
              className="rounded-[6px] border border-border bg-card px-2 py-1 font-mono text-[11.5px] font-semibold text-[#585a52]"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3.5 text-[14px] leading-relaxed text-[#585a52]">
          Paste the link.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={accent}
      className="hidden text-center xl:block xl:translate-y-[67px]"
    >
      <div className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-muted">
        On your PC?
      </div>
      {/* Half a cycle out of step with the phone, so the two never bob
          together and read as one object. */}
      <div className="csa-anim csa-float-off mx-auto mt-4 w-full max-w-[250px]">
        <div className="relative h-[160px] overflow-hidden rounded-[12px] bg-ink p-2.5">
          <div className="relative grid h-full place-items-center rounded-[8px] border-[1.5px] border-dashed border-white/35">
            <span className="csa-anim csa-flash csa-hit absolute -inset-[1.5px] block rounded-[8px] border-[1.5px] border-[var(--csa-accent)] bg-[var(--csa-accent-wash)] opacity-0" />
            <span className="csa-anim csa-hide csa-zonetext absolute inset-x-0 bottom-2.5 text-[12px] text-white/50">
              drop zone
            </span>
            <span className="csa-anim csa-flash csa-ok absolute inset-x-0 bottom-2 text-[12px] font-bold text-[var(--csa-ok)] opacity-0">
              ✓ ready to tag
            </span>
          </div>

          {/* Dashed trail behind the file as it glides in, then gone. */}
          <span className="csa-anim csa-trail absolute left-3.5 top-[22px] w-[86px] origin-left rotate-[26deg] border-t-2 border-dashed border-[var(--csa-accent-trail)] opacity-0" />

          <span className="csa-anim csa-glide absolute left-[75px] top-[52px] block">
            <span className="flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-white px-2.5 py-[7px] font-mono text-[12px] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
              <span className="block h-5 w-4 bg-[var(--csa-accent)] [clip-path:polygon(0_0,70%_0,100%_25%,100%_100%,0_100%)]" />
              clip.mp4
            </span>
            <svg
              className="absolute -bottom-4 -right-2.5 [filter:drop-shadow(0_1px_1.5px_rgba(0,0,0,0.45))]"
              width="15"
              height="19"
              viewBox="0 0 16 20"
              aria-hidden
            >
              <path
                d="M1.5 1.5 L1.5 16 L5.3 12.3 L8.2 18.6 L10.6 17.5 L7.8 11.3 L13 11.3 Z"
                fill="#fff"
                stroke="#1e211d"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {/* Stand and base in the page's own light grey, so the monitor sits on
            the background rather than floating. */}
        <div className="mx-auto h-[26px] w-[70px] bg-[#d8d4c8] [clip-path:polygon(25%_0,75%_0,100%_100%,0_100%)]" />
        <div className="mx-auto h-1.5 w-[130px] rounded-[4px] bg-[#cfcabd]" />
      </div>
      <p className="mt-[18px] text-[14px] leading-relaxed text-[#585a52]">
        Drag the file in.
        <br />
        mp4 or mov, under 50MB.
      </p>
    </div>
  );
}
