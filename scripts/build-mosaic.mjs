/**
 * Builds ONE pre-composed "ghost mosaic" background tile from the published map
 * thumbnails: a grid of the covers, greyscaled + lightly blurred + heavily
 * compressed into a single small WebP at /public/ghost-mosaic.webp.
 *
 * It's purely decorative and rendered at ~5% opacity, so quality is traded hard
 * for size. Re-run whenever maps are added:
 *   npm run build-mosaic
 *
 * Dependency-free .env.local loader (same style as snapshot-peeks) so it runs
 * under plain `node`.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

// --- tunables -------------------------------------------------------------
const TILE_W = 176;
const TILE_H = 132; // 4:3 cells
const COLS = 4;
const BLUR_SIGMA = 0.5; // very light — keep the maps clearly readable
const WEBP_QUALITY = 46; // higher now there's real detail to keep
// --------------------------------------------------------------------------

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function fetchMapCovers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env in .env.local");
  const endpoint = `${url}/rest/v1/maps?select=slug,cover_image_url&published=eq.true`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase maps fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows
    .filter((r) => r.cover_image_url)
    .map((r) => ({ slug: r.slug, url: r.cover_image_url }));
}

async function main() {
  loadEnvLocal();
  const covers = await fetchMapCovers();
  if (covers.length === 0) throw new Error("No published maps with covers.");
  console.log(`Found ${covers.length} map covers.`);

  // Download + resize each cover to a greyscale-ready tile (kept in colour here;
  // the whole mosaic is greyscaled at the end so it composites uniformly).
  const tiles = [];
  for (const c of covers) {
    try {
      const buf = Buffer.from(await (await fetch(c.url)).arrayBuffer());
      const tile = await sharp(buf)
        .resize(TILE_W, TILE_H, { fit: "cover", position: "centre" })
        .toBuffer();
      tiles.push(tile);
    } catch (e) {
      console.warn(`  skipped ${c.slug}: ${e.message}`);
    }
  }
  if (tiles.length === 0) throw new Error("No tiles could be downloaded.");

  const rows = Math.ceil(tiles.length / COLS);
  const cells = COLS * rows;
  const width = COLS * TILE_W;
  const height = rows * TILE_H;

  // Fill the full rectangle; repeat from the start for any leftover cells so
  // there are no blank gaps (minimal repeats).
  const composite = [];
  for (let i = 0; i < cells; i++) {
    const tile = tiles[i % tiles.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    composite.push({ input: tile, top: row * TILE_H, left: col * TILE_W });
  }

  const out = resolve(publicDir, "ghost-mosaic.webp");

  // Pass 1: composite the colour tiles onto the cream base → a flat buffer.
  const mosaic = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 246, g: 243, b: 234 }, // cream base
    },
  })
    .composite(composite)
    .png()
    .toBuffer();

  // Pass 2: greyscale + blur the flattened mosaic (composite overlays aren't
  // affected by chained greyscale/blur, so this second pass is required), then
  // compress hard to WebP.
  await sharp(mosaic)
    .greyscale()
    .blur(BLUR_SIGMA)
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(out);

  const { size } = await import("node:fs").then((fs) =>
    fs.promises.stat(out)
  );
  console.log(
    `Wrote ${out} — ${width}x${height}, ${(size / 1024).toFixed(1)} KB` +
      (size > 60 * 1024 ? "  ⚠ over 60KB target" : "")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
