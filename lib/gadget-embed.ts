// Turning a submitted clip link into something we can put on the page.
//
// This is deliberately an ALLOWLIST, not a general "accept whatever the admin
// pasted". A clip URL ends up either as the src of an <iframe> on a public,
// ad-monetised page or as an outbound link our readers are told to trust, and
// neither should point somewhere nobody has looked at.
//
// Two tiers, because they carry very different risk:
//
//   EMBED  we frame the host inside our page. Requires that someone has
//          actually checked its framing headers by hand. Currently medal.tv
//          only. Verified 2026-09-19 against a real clip:
//
//            cdn.medal.tv/mediac/<file>.mp4          403 — NOT hotlinkable, so
//                                                    a plain <video src> fails
//            medal.tv/api/content/<id>/socialVideoUrl 307 -> mp4, but 151MB for
//                                                    a 50s clip, unusable
//            medal.tv/games/<game>/clip/<id>         200, frame-ancestors *, no
//                                                    X-Frame-Options — framable,
//                                                    and the URL Medal itself
//                                                    advertises as twitter:player
//
//          Note the singular: the page a human visits is /clips/<id>, the
//          player is /clip/<id>. That one character is the whole transform.
//
//   LINK   we do not frame it; we render a card that clicks out. No framing
//          headers to verify, because no frame — the only requirement is that
//          the host is somewhere we are willing to send a reader.
//
// Anything not on either list is REJECTED at the point of writing, so a bad URL
// never reaches the database rather than being caught at render time.
//
// Why these five LINK hosts: they are the platforms Siege clips actually get
// posted to, and they are the ones that have turned up in the submission queue.
// TikTok and YouTube are already on the public submission allowlist. x.com and
// streamable.com are here because clips get cross-posted there. Nothing was
// added speculatively — if a host is not here, no setup can link to it.

export type ClipKind = "embed" | "link";

export type ClipRender =
  | { kind: "embed"; src: string; platform: string }
  | { kind: "link"; href: string; platform: string }
  | { kind: "rejected"; reason: string };

type HostRule = {
  platform: string;
  mode: ClipKind;
  /**
   * Query params worth keeping. Everything else is dropped.
   *
   * An allowlist rather than a blocklist of known trackers: new referral params
   * appear all the time (?invite=, ?si=, ?is_from_webapp=), and a blocklist
   * silently starts leaking the moment a platform invents one. Keeping only
   * what the URL needs to resolve cannot leak by omission.
   */
  keepParams?: string[];
};

const HOSTS: Record<string, HostRule> = {
  "medal.tv": { platform: "Medal", mode: "embed" },
  "www.medal.tv": { platform: "Medal", mode: "embed" },

  "tiktok.com": { platform: "TikTok", mode: "link" },
  "www.tiktok.com": { platform: "TikTok", mode: "link" },
  "vm.tiktok.com": { platform: "TikTok", mode: "link" },

  // v is the video id and t is a start offset — without v the URL is just the
  // YouTube homepage, so it has to survive the strip.
  "youtube.com": { platform: "YouTube", mode: "link", keepParams: ["v", "t"] },
  "www.youtube.com": { platform: "YouTube", mode: "link", keepParams: ["v", "t"] },
  "m.youtube.com": { platform: "YouTube", mode: "link", keepParams: ["v", "t"] },
  "youtu.be": { platform: "YouTube", mode: "link", keepParams: ["t"] },

  "x.com": { platform: "X", mode: "link" },
  "www.x.com": { platform: "X", mode: "link" },
  "twitter.com": { platform: "X", mode: "link" },
  "www.twitter.com": { platform: "X", mode: "link" },

  "streamable.com": { platform: "Streamable", mode: "link" },
  "www.streamable.com": { platform: "Streamable", mode: "link" },
};

/** Every platform we will accept, for admin-facing help text. */
export const ALLOWED_PLATFORMS = Array.from(
  new Set(Object.values(HOSTS).map((h) => h.platform))
);

/** What an uncredited clip is attributed to, and the only copy of that string. */
export const REJECTED_MESSAGE = `That link is not on the allowlist. Accepted: ${ALLOWED_PLATFORMS.join(
  ", "
)} — anything else has to be uploaded as a file.`;

/**
 * How a given clip URL should be shown.
 *
 * Never throws on junk input. Anything unparseable, non-https, or off the
 * allowlist comes back as `rejected` with a reason fit to show an admin.
 */
export function resolveClip(raw: string): ClipRender {
  const href = (raw ?? "").trim();
  if (!href) return { kind: "rejected", reason: "No link given." };

  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return { kind: "rejected", reason: "That is not a valid URL." };
  }

  // https only. This is what keeps javascript: and data: out — they parse
  // perfectly well as URLs, so rejecting on protocol is the actual guard, not
  // the allowlist below.
  if (u.protocol !== "https:") {
    return { kind: "rejected", reason: "Links must start with https://" };
  }

  const rule = HOSTS[u.hostname.toLowerCase()];
  if (!rule) return { kind: "rejected", reason: REJECTED_MESSAGE };

  const clean = strip(u, rule.keepParams);

  if (rule.mode === "embed") {
    // /games/<game>/clips/<id>  ->  /games/<game>/clip/<id>
    const parts = clean.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("clips");
    if (i !== -1 && parts[i + 1]) {
      const rebuilt = [...parts];
      rebuilt[i] = "clip";
      return {
        kind: "embed",
        src: `https://medal.tv/${rebuilt.join("/")}`,
        platform: rule.platform,
      };
    }
    if (parts.includes("clip")) {
      return {
        kind: "embed",
        src: `https://medal.tv/${parts.join("/")}`,
        platform: rule.platform,
      };
    }
    // A medal.tv URL that is not a clip — a profile, say. Nothing to frame, so
    // it clicks out rather than embedding an arbitrary Medal page.
    return { kind: "link", href: clean.toString(), platform: rule.platform };
  }

  return { kind: "link", href: clean.toString(), platform: rule.platform };
}

/**
 * Drop every query param except the ones the URL needs, and the fragment.
 *
 * Referral and tracking junk (?invite=, ?si=, ?utm_source=, ?is_from_webapp=)
 * otherwise gets stored in our database and replayed to every visitor, which
 * means holding someone's referral code for no reason.
 */
function strip(u: URL, keep?: string[]): URL {
  const out = new URL(u.toString());
  const kept = new URLSearchParams();
  for (const k of keep ?? []) {
    const v = out.searchParams.get(k);
    if (v) kept.set(k, v);
  }
  out.search = kept.toString();
  out.hash = "";
  return out;
}

/** Whether we will store this URL at all. Used to validate admin input. */
export function isAllowedClip(raw: string): boolean {
  return resolveClip(raw).kind !== "rejected";
}

/** Whether this URL gets framed rather than linked. */
export function isEmbeddable(raw: string): boolean {
  return resolveClip(raw).kind === "embed";
}

/**
 * The form to STORE.
 *
 * Normalise once, on write, so the database holds the cleaned URL rather than
 * whatever arrived with referral params attached. The renderer normalises again
 * anyway, so this changes nothing a visitor sees — it changes what we keep.
 *
 * Rejected input is returned trimmed but untouched; validation is a separate
 * concern and the caller is expected to have refused it already.
 */
export function normalizeEmbed(raw: string): string {
  const r = resolveClip(raw);
  if (r.kind === "embed") return r.src;
  if (r.kind === "link") return r.href;
  return (raw ?? "").trim();
}

/**
 * Validate and normalise in one step, for the admin write paths.
 *
 * Throws with a message fit to show the admin if the host is not allowed, and
 * otherwise returns the cleaned URL ready to store. All three places that write
 * a setup go through this, so "what may be saved" is decided once — a host
 * added to HOSTS above is live everywhere without touching an action.
 */
export function acceptClipUrl(raw: string): string {
  const r = resolveClip(raw);
  if (r.kind === "rejected") throw new Error(r.reason);
  return r.kind === "embed" ? r.src : r.href;
}
