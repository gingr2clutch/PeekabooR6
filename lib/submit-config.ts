import type { SubmitKind } from "@/lib/analytics";

// The two variants of the community submission section, ported from
// submit-clip.html and submit-gadget.html. Everything that differs between the
// demos lives here; SubmitSpot itself is identical for both.
//
// Accent hexes are the demos' own values, not the site tokens: the demo orange
// (#ec7311) is a shade off brand (#f2640e), and matching the approved design
// matters more than reusing the token for a section that is visually its own
// thing. The blue pair is what the gadget demo specifies.

export type SubmitConfig = {
  kind: SubmitKind;
  /* Anchor id, so the hamburger's "Submit a clip" can link straight here. */
  anchorId: string;
  accent: string;
  accentDark: string;
  /* Confetti palette — the demo varies this per accent. */
  confetti: string[];

  heroTitle: string;
  heroAccent: string;
  heroSub: string;
  cardTitle: string;
  cardTitleAccent: string;
  cardTag: string;

  stepTwoLabel: string;
  dropTitle: string;
  dropSub: string;
  /* accept attribute + what the copy promises. png only on the gadget side. */
  accept: string;

  nextOneLabel: string;
  spotLabel: string;
  spotPlaceholder: string;
  hintIdle: string;
  hintNew: string;
  creditVerb: string;
  submitLabel: string;
  doneTitle: string;
  doneBody: string;
  previewSuffix: string;
};

export const PEEK_SUBMIT: SubmitConfig = {
  kind: "peek",
  anchorId: "submit",
  accent: "#ec7311",
  accentDark: "#d9640a",
  confetti: ["#ec7311", "#3f8f7d", "#69ab4a", "#e0a92e", "#d8603a", "#f2ead8"],

  heroTitle: "Got a ",
  heroAccent: "peek clip?",
  heroSub:
    "Drop it here. If it makes the site, your name goes on the peek — forever.",
  cardTitle: "Submit a clip ",
  cardTitleAccent: "· 30 seconds",
  cardTag: "Any clip works — a file off your PC, a TikTok, a YouTube link.",

  stepTwoLabel: "TAG THE PEEK",
  dropTitle: "Drag your clip here",
  dropSub: "mp4 / mov · under 50MB",
  accept: "video/mp4,video/quicktime",

  nextOneLabel: "Next → tag the peek",
  spotLabel: "PEEK NAME",
  spotPlaceholder: "type it… e.g. Lounge Window",
  hintIdle: "Start typing — we'll match it to a peek we already have.",
  hintNew: "NEW peek",
  creditVerb: "Clipped by",
  submitLabel: "Submit clip 🚀",
  doneTitle: "Clip submitted!",
  doneBody: "goes on the peek page for good.",
  previewSuffix: "PAGE",
};

export const GADGET_SUBMIT: SubmitConfig = {
  kind: "gadget",
  anchorId: "submit-gadget",
  accent: "#2e6f96",
  accentDark: "#22597a",
  confetti: ["#2e6f96", "#3f8f7d", "#69ab4a", "#8fc3e0", "#22597a", "#f2ead8"],

  heroTitle: "Know a ",
  heroAccent: "gadget spot?",
  heroSub:
    "Drop a clip or screenshot of it. If it makes the site, your name goes on the placement — forever.",
  cardTitle: "Submit a placement ",
  cardTitleAccent: "· 30 seconds",
  cardTag: "A clip or a screenshot works — file, TikTok, or YouTube link.",

  stepTwoLabel: "TAG THE SPOT",
  dropTitle: "Drag your clip or screenshot here",
  dropSub: "mp4 / mov / png · under 50MB",
  accept: "video/mp4,video/quicktime,image/png",

  nextOneLabel: "Next → tag the spot",
  spotLabel: "SPOT NAME",
  spotPlaceholder: "type it… e.g. Fireplace Cam",
  hintIdle: "Start typing — we'll match it to a placement we already have.",
  hintNew: "NEW placement",
  creditVerb: "Placed by",
  submitLabel: "Submit placement 🚀",
  doneTitle: "Placement submitted!",
  doneBody: "goes on that pin for good.",
  previewSuffix: "PLACEMENT",
};

// Server-side limits. Must not exceed the bucket's own file_size_limit, which
// is itself capped by the project's global upload ceiling — currently 50MB, so
// the bucket was created at 50MB rather than the 100MB originally specified.
// Promising 100MB here would let a 60MB file pass every app-side check and
// then fail at storage with an opaque error.
//
// To restore 100MB: raise Project Settings -> Storage -> Upload file size
// limit, set the bucket's file_size_limit to 104857600, then change this
// constant and the two dropSub strings above.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_MIME = [
  "video/mp4",
  "video/quicktime",
  "image/png",
] as const;

// Link hosts the demo's step 1 accepts.
export const ALLOWED_LINK_HOSTS = [
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "medal.tv",
] as const;

export function isAllowedSourceUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return ALLOWED_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
