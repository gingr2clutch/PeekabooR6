// Turning a submitted clip link into something we can put on the page.
//
// This is deliberately an ALLOWLIST of hosts whose embed URL shape has been
// checked by hand, not a general "iframe whatever the admin pasted". An
// embed_url ends up as the src of an <iframe> on a public, ad-monetised page;
// framing an arbitrary origin there would hand a third party a frame on our
// domain. Anything not on the list gets no iframe.
//
// Currently one host: medal.tv, which is what the submissions in the queue
// actually use. Verified 2026-09-19 against a real clip:
//
//   cdn.medal.tv/mediac/<file>.mp4          403 — the file is NOT hotlinkable,
//                                           so a plain <video src> cannot work
//   medal.tv/api/content/<id>/socialVideoUrl 307 -> video/mp4, but 151MB for a
//                                           50s clip, so not usable either
//   medal.tv/games/<game>/clip/<id>         200, frame-ancestors *, no
//                                           X-Frame-Options — framable, and it
//                                           is the URL Medal itself advertises
//                                           as twitter:player
//
// Note the singular: the page a human visits is /clips/<id>, the player is
// /clip/<id>. That one character is the whole transformation.
//
// YouTube and TikTok are on the submission allowlist too and both have embed
// forms, but I have not verified their behaviour here, so they are not
// included. Adding one means checking its framing headers first, not assuming.

export type ClipRender =
  | { kind: "embed"; src: string }
  | { kind: "link"; href: string };

const MEDAL_HOSTS = ["medal.tv", "www.medal.tv"];

/**
 * How a given clip URL should be shown.
 *
 * Returns an iframe src for hosts we have verified, and otherwise a plain link
 * for the reader to open in a new tab. Never throws on junk input — an
 * unparseable string degrades to a link, which is inert.
 */
export function resolveClip(raw: string): ClipRender {
  const href = raw.trim();
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return { kind: "link", href };
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { kind: "link", href };
  }

  if (MEDAL_HOSTS.includes(u.hostname.toLowerCase())) {
    // /games/<game>/clips/<id>  ->  /games/<game>/clip/<id>
    // Query is dropped: these arrive with ?invite=... referral tokens that have
    // no business being replayed to every visitor.
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("clips");
    if (i !== -1 && parts[i + 1]) {
      const rebuilt = [...parts];
      rebuilt[i] = "clip";
      return { kind: "embed", src: `https://medal.tv/${rebuilt.join("/")}` };
    }
    // Already in /clip/<id> form.
    if (parts.includes("clip")) {
      return { kind: "embed", src: `https://medal.tv/${parts.join("/")}` };
    }
  }

  return { kind: "link", href };
}

/** Whether a URL is one we would actually embed. Used to validate admin input. */
export function isEmbeddable(raw: string): boolean {
  return resolveClip(raw).kind === "embed";
}

/**
 * The form to STORE for an embeddable link.
 *
 * The renderer normalises anyway, so this changes nothing a visitor sees — but
 * what arrives from a submission carries an ?invite= referral token, and
 * keeping it in our database means holding someone's referral code for no
 * reason and re-reading it on every render. Normalise once, on write.
 *
 * Non-embeddable input is returned untouched; validation is a separate concern.
 */
export function normalizeEmbed(raw: string): string {
  const r = resolveClip(raw);
  return r.kind === "embed" ? r.src : raw.trim();
}
