/**
 * Manually capture today's peek stats snapshots (the same job the daily Vercel
 * Cron runs). Used to seed day-zero right after the 024 migration, and safe to
 * re-run any time — it's idempotent (one row per peek per UTC day).
 *
 * Usage:
 *   npm run snapshot-peeks
 *
 * Loads .env.local so it writes with SUPABASE_SERVICE_ROLE_KEY. Dependency-free
 * env loading so it runs under plain `tsx`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  // Dynamic import AFTER env load so lib/supabase picks up the values.
  const { captureDailySnapshots } = await import("../lib/snapshots");
  const result = await captureDailySnapshots();
  console.log(
    `Snapshotted ${result.peeks} published peeks for ${result.date} (idempotent — existing rows skipped).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
