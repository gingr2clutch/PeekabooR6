/**
 * Manually preview the #new-peeks Discord post WITHOUT publishing a real peek.
 *
 * Loads .env.local, then posts an embed to DISCORD_PEEK_WEBHOOK_URL so you can
 * confirm the format in your channel before relying on it for real peeks.
 *
 * Usage:
 *   npm run test-discord                 # post a hardcoded SAMPLE peek
 *   npm run test-discord -- --slug=foo   # post a REAL peek's embed (by slug)
 *
 * The --slug mode is a forced preview: it does NOT touch the peek's
 * posted_to_discord flag, so it's safe to run repeatedly and never interferes
 * with the real once-only auto-posting.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local into process.env BEFORE importing lib/* (lib/supabase reads
// env at module-eval time). Dependency-free so it runs under plain `tsx`.
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return; // no .env.local — rely on whatever is already in the environment
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

async function main(): Promise<void> {
  const webhookUrl = process.env.DISCORD_PEEK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(
      "DISCORD_PEEK_WEBHOOK_URL is not set (.env.local or environment)."
    );
    process.exit(1);
  }

  // Dynamic import AFTER env load so lib/supabase picks up the values.
  const { buildPeekEmbed, sendDiscordEmbed, loadPeekEmbedDataBySlug } =
    await import("../lib/discord");

  const slugArg = process.argv
    .find((a) => a.startsWith("--slug="))
    ?.slice("--slug=".length);

  let data;
  if (slugArg) {
    data = await loadPeekEmbedDataBySlug(slugArg);
    if (!data) {
      console.error(`No peek found with slug "${slugArg}".`);
      process.exit(1);
    }
    console.log(`Posting REAL peek "${data.name}" (${slugArg})…`);
  } else {
    // Representative sample so you can eyeball the layout/colors.
    data = {
      name: "Lounge Door",
      slug: "clubhouse-lounge-door-first-floor",
      // Real Clubhouse map cover so the sample matches the live behavior
      // (each post shows that peek's map image).
      mapCoverUrl:
        "https://pub-c11cdf7d63734d52945843745d8e60a8.r2.dev/maps/a5875ddf-ad15-48e5-beca-7711049c3e96-cover-1777904244700.png",
      difficulty: 3,
      risk: "medium" as const,
      base_success_rate: 78,
      worked_votes: 0,
      vote_count: 0,
      created_at: "2026-06-23T12:00:00.000Z",
      floorName: "First floor",
      mapName: "Clubhouse",
    };
    console.log("Posting SAMPLE peek embed…");
  }

  const ok = await sendDiscordEmbed(webhookUrl, buildPeekEmbed(data));
  if (ok) {
    console.log("✓ Posted. Check your #new-peeks channel.");
  } else {
    console.error("✗ Post failed — see the error above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
