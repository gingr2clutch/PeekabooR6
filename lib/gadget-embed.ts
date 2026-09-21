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
//          actually checked it can be framed. Checked by hand:
//
//            medal.tv/games/<game>/clip/<id>   200, frame-ancestors *, no
//                                              X-Frame-Options. The mp4 itself
//                                              is NOT hotlinkable (403) and the
//                                              socialVideoUrl redirect is 151MB
//                                              for a 50s clip, so framing their
//                                              player is the only way to show
//                                              a Medal clip at all.
//                                              [verified 2026-09-19]
//            youtube.com/embed/<id>            200 on a real id, no
//                                              frame-ancestors, no
//                                              X-Frame-Options.
//                                              [verified 2026-09-20]
//            tiktok.com/embed/v2/<id>          documented iframe endpoint; its
//            streamable.com/e/<id>             CSP carries no frame-ancestors.
//                                              Both returned 400/404 when
//                                              probed with a fabricated id, so
//                                              neither has been confirmed
//                                              against a real clip yet.
//
//          Note Medal's singular: the page a human visits is /clips/<id>, the
//          player is /clip/<id>. That one character is the whole transform.
//
//   LINK   we do not frame it; we render a card that clicks out. No framing
//          headers to verify, because no frame — the only requirement is that
//          the host is somewhere we are willing to send a reader. This is also
//          where an embeddable host lands when the URL is not a clip (a Medal
//          profile) or carries no id we can extract (a vm.tiktok.com shortlink).
//
// Anything not on either list is REJECTED at the point of writing, so a bad URL
// never reaches the database rather than being caught at render time.
//
// Why these hosts: they are the platforms Siege clips actually get posted to,
// and the ones that have turned up in the submission queue. TikTok and YouTube
// are already on the public submission allowlist; x.com and streamable.com are
// here because clips get cross-posted there. Nothing was added speculatively —
// if a host is not here, no setup can link to it.

export type ClipKind = "embed" | "link";

/**
 * The shape of the box a clip wants.
 *
 * TikTok is shot vertically and its player is 9:16; everything else here is
 * 16:9. Carrying this on the resolved clip keeps host names out of the page —
 * adding a portrait host later is a flag in HOSTS, not a condition in JSX.
 */
export type ClipAspect = "video" | "portrait";

export type ClipRender =
  | { kind: "embed"; src: string; platform: string; aspect: ClipAspect }
  | { kind: "link"; href: string; platform: string; aspect: ClipAspect }
  | { kind: "rejected"; reason: string };

type HostRule = {
  platform: string;
  /**
   * Query params worth keeping. Everything else is dropped.
   *
   * An allowlist rather than a blocklist of known trackers: new referral params
   * appear all the time (?invite=, ?si=, ?is_from_webapp=), and a blocklist
   * silently starts leaking the moment a platform invents one. Keeping only
   * what the URL needs to resolve cannot leak by omission.
   */
  keepParams?: string[];
  /**
   * The framable URL for this link, or null if it has no embed form.
   *
   * Returning null is not a failure — it drops the clip to a click-out card,
   * which is the correct outcome for a host with no iframe player and for a URL
   * on an embeddable host that is not actually a clip (a profile page, say).
   */
  embed?: (u: URL) => string | null;
  /** Vertical player. Only TikTok so far. */
  portrait?: boolean;
};

const HOSTS: Record<string, HostRule> = {
  // /games/<game>/clips/<id> -> /games/<game>/clip/<id>. The page a human
  // visits is /clips/, the player is /clip/ — that one character is the whole
  // transform.
  "medal.tv": { platform: "Medal", embed: medalEmbed },
  "www.medal.tv": { platform: "Medal", embed: medalEmbed },

  // /@user/video/<id> -> /embed/v2/<id>, TikTok's documented iframe endpoint.
  // vm.tiktok.com short links carry no video id in the path — resolving one
  // needs a network round trip, which is not something to do at render time, so
  // they stay click-outs.
  "tiktok.com": { platform: "TikTok", embed: tiktokEmbed, portrait: true },
  "www.tiktok.com": { platform: "TikTok", embed: tiktokEmbed, portrait: true },
  "vm.tiktok.com": { platform: "TikTok", portrait: true },

  // v is the video id and t a start offset — without v the URL is just the
  // YouTube homepage, so both have to survive the strip.
  "youtube.com": { platform: "YouTube", keepParams: ["v", "t"], embed: youtubeEmbed },
  "www.youtube.com": { platform: "YouTube", keepParams: ["v", "t"], embed: youtubeEmbed },
  "m.youtube.com": { platform: "YouTube", keepParams: ["v", "t"], embed: youtubeEmbed },
  "youtu.be": { platform: "YouTube", keepParams: ["t"], embed: youtubeEmbed },

  // No iframe player. X's embed needs widgets.js, which means running their
  // script in our page rather than framing theirs — not worth it for a clip.
  "x.com": { platform: "X" },
  "www.x.com": { platform: "X" },
  "twitter.com": { platform: "X" },
  "www.twitter.com": { platform: "X" },

  "streamable.com": { platform: "Streamable", embed: streamableEmbed },
  "www.streamable.com": { platform: "Streamable", embed: streamableEmbed },
};

function medalEmbed(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("clips");
  if (i !== -1 && parts[i + 1]) {
    const rebuilt = [...parts];
    rebuilt[i] = "clip";
    return `https://medal.tv/${rebuilt.join("/")}`;
  }
  if (parts.includes("clip")) return `https://medal.tv/${parts.join("/")}`;
  return null;
}

function tiktokEmbed(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("video");
  const id = i !== -1 ? parts[i + 1] : null;
  return id && /^\d+$/.test(id) ? `https://www.tiktok.com/embed/v2/${id}` : null;
}

function youtubeEmbed(u: URL): string | null {
  const id =
    u.hostname.toLowerCase() === "youtu.be"
      ? u.pathname.split("/").filter(Boolean)[0]
      : u.searchParams.get("v");
  if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
  const t = (u.searchParams.get("t") ?? "").replace(/[^0-9]/g, "");
  return `https://www.youtube.com/embed/${id}${t ? `?start=${t}` : ""}`;
}

function streamableEmbed(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  // /<id> is a watch page, /e/<id> is already the player.
  const id = parts[0] === "e" ? parts[1] : parts[0];
  return id && /^[\w-]+$/.test(id) ? `https://streamable.com/e/${id}` : null;
}

/** Every platform we will accept, for admin-facing help text. */
export const ALLOWED_PLATFORMS = Array.from(
  new Set(Object.values(HOSTS).map((h) => h.platform))
);

/** Shown to the admin when a pasted URL is refused. */
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
  const src = rule.embed?.(clean) ?? null;

  const aspect: ClipAspect = rule.portrait ? "portrait" : "video";

  return src
    ? { kind: "embed", src, platform: rule.platform, aspect }
    : { kind: "link", href: clean.toString(), platform: rule.platform, aspect };
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
