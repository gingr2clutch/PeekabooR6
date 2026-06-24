import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
import { rating } from "./rate";

// Public site origin used to build the peek link in the embed. Mirrors the
// hardcoded SITE_URL used elsewhere (app/peeks/[slug]/page.tsx, sitemap).
const SITE_URL = "https://peekaboor6.com";

// Site brand orange (#ff6a00) as a decimal int — Discord embed colors are ints.
const BRAND_ORANGE = 0xff6a00;

// Fallback embed image when a peek's map has no cover. Must be a raster format
// (Discord doesn't render SVG embed images), so the PNG logo, not logo.svg.
const LOGO_FALLBACK_URL = `${SITE_URL}/logo.png`;

// The joined data a peek embed needs: the peek plus its floor + map context.
// mapCoverUrl is the map's cover image (maps.cover_image_url) — the same
// thumbnail shown on the homepage maps grid.
export type PeekEmbedData = {
  name: string;
  slug: string;
  mapCoverUrl: string | null;
  difficulty: number;
  risk: "low" | "medium" | "high";
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
  created_at: string | null;
  floorName: string | null;
  mapName: string | null;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Map covers are stored as absolute R2 URLs; normalize defensively in case one
// is ever a site-relative path, and fall back to the brand logo so the embed
// never shows a broken image.
function mapImageUrl(coverUrl: string | null): string {
  if (!coverUrl) return LOGO_FALLBACK_URL;
  if (/^https?:\/\//i.test(coverUrl)) return coverUrl;
  return `${SITE_URL}${coverUrl.startsWith("/") ? "" : "/"}${coverUrl}`;
}

// Build the Discord rich embed for a peek. Pure (no I/O) so it can be reused
// by the test script (scripts/test-discord-peek.ts).
export function buildPeekEmbed(p: PeekEmbedData): Record<string, unknown> {
  // For a brand-new peek with no votes this is the seeded letter grade
  // (S/A/B/C); once it has ≥5 votes the label carries +/- and a measured %.
  const r = rating(p.base_success_rate, p.worked_votes, p.vote_count);
  const effectiveness =
    r.tier === "measured" ? `${r.label} · ${r.pct}%` : r.label;

  const location = [p.mapName, p.floorName].filter(Boolean).join(" · ");

  const embed: Record<string, unknown> = {
    title: p.name,
    url: `${SITE_URL}/peeks/${p.slug}`,
    color: BRAND_ORANGE,
    fields: [
      { name: "Effectiveness", value: effectiveness, inline: true },
      { name: "Risk", value: capitalize(p.risk), inline: true },
      { name: "Difficulty", value: `${p.difficulty}/5`, inline: true },
    ],
    footer: { text: "peekabooR6 · new peek" },
  };
  if (location) embed.description = location;
  // Always show the peek's map image (or the logo fallback) — never broken.
  embed.image = { url: mapImageUrl(p.mapCoverUrl) };
  if (p.created_at) embed.timestamp = new Date(p.created_at).toISOString();
  return embed;
}

// Low-level webhook POST. Returns true only when Discord accepts it (204).
// Never throws — callers decide what to do with a false.
export async function sendDiscordEmbed(
  webhookUrl: string,
  embed: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error(
        `[discord] webhook responded ${res.status} ${res.statusText}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[discord] webhook request failed:", err);
    return false;
  }
}

const EMBED_SELECT =
  "name, slug, difficulty, risk, base_success_rate, worked_votes, vote_count, created_at, floors ( name, maps ( name, cover_image_url ) )";

type EmbedRow = {
  name: string;
  slug: string;
  difficulty: number;
  risk: "low" | "medium" | "high";
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
  created_at: string | null;
  floors: {
    name: string | null;
    maps: { name: string | null; cover_image_url: string | null } | null;
  } | null;
};

function rowToEmbedData(row: EmbedRow): PeekEmbedData {
  return {
    name: row.name,
    slug: row.slug,
    mapCoverUrl: row.floors?.maps?.cover_image_url ?? null,
    difficulty: row.difficulty,
    risk: row.risk,
    base_success_rate: row.base_success_rate,
    worked_votes: row.worked_votes,
    vote_count: row.vote_count,
    created_at: row.created_at,
    floorName: row.floors?.name ?? null,
    mapName: row.floors?.maps?.name ?? null,
  };
}

async function loadEmbedData(
  sb: SupabaseClient,
  column: "id" | "slug",
  value: string
): Promise<PeekEmbedData | null> {
  const { data, error } = await sb
    .from("peeks")
    .select(EMBED_SELECT)
    .eq(column, value)
    .maybeSingle();
  if (error) {
    console.error("[discord] failed to load peek for embed:", error);
    return null;
  }
  if (!data) return null;
  return rowToEmbedData(data as unknown as EmbedRow);
}

// Exported for the test script's --slug mode (forced preview of a real peek).
export async function loadPeekEmbedDataBySlug(
  slug: string
): Promise<PeekEmbedData | null> {
  return loadEmbedData(supabaseAdmin(), "slug", slug);
}

async function releaseClaim(sb: SupabaseClient, peekId: string): Promise<void> {
  await sb.from("peeks").update({ posted_to_discord: false }).eq("id", peekId);
}

// Idempotently announce a newly-published peek in the Discord #new-peeks
// channel. Safe to call from EVERY publish path — the atomic claim guarantees
// a peek posts at most once.
//
// Returns silently (no-op) when:
//   - DISCORD_PEEK_WEBHOOK_URL is unset (local dev / feature off),
//   - the peek is not published, or
//   - it was already posted (the claim matches no row).
//
// Never throws: posting to Discord is secondary to saving the peek, so the
// caller's flow is never broken by a Discord outage. On a delivery failure the
// claim is released so a later re-publish can retry (Discord only posts on a
// 2xx, so this can't double-post in practice).
export async function postPeekToDiscord(peekId: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_PEEK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const sb = supabaseAdmin();

    // Atomic claim: flip the flag only while it's still false AND the peek is
    // published. Concurrent calls, retries, or re-deploys can't both match
    // `posted_to_discord = false`, so exactly one claim (and post) wins.
    const { data: claimed, error: claimErr } = await sb
      .from("peeks")
      .update({ posted_to_discord: true })
      .eq("id", peekId)
      .eq("published", true)
      .eq("posted_to_discord", false)
      .select("id");
    if (claimErr) {
      console.error("[discord] claim update failed:", claimErr);
      return;
    }
    if (!claimed || claimed.length === 0) return; // already posted or not published

    const data = await loadEmbedData(sb, "id", peekId);
    if (!data) {
      await releaseClaim(sb, peekId);
      return;
    }

    const ok = await sendDiscordEmbed(webhookUrl, buildPeekEmbed(data));
    if (ok) {
      console.log(`[discord] announced peek ${peekId} (${data.slug}) in #new-peeks`);
    } else {
      await releaseClaim(sb, peekId);
    }
  } catch (err) {
    console.error("[discord] postPeekToDiscord error for", peekId, err);
    try {
      await releaseClaim(supabaseAdmin(), peekId);
    } catch {
      // best-effort
    }
  }
}
