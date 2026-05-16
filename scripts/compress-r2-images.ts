/**
 * One-off: re-compress every floor bird's-eye and every peek poster that's
 * already living in R2 as a full-size original. Matches the new upload-time
 * compression (WebP, q=0.85, floor ≤1600x1000, peek ≤1280x720) so older
 * uploads load as quickly as new ones.
 *
 * Run:
 *   npx tsx scripts/compress-r2-images.ts
 *
 * Idempotent: rows whose URL already ends in .webp are skipped. The
 * original PNG/JPG is intentionally left in R2 (cheap, and a manual
 * undo path if something goes wrong) — sweep later if you want.
 */

import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name} (load via --env-file=.env.local)`);
  }
  return v;
};

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY"),
    secretAccessKey: required("R2_SECRET_KEY"),
  },
});
const BUCKET = required("R2_BUCKET");
const PUBLIC_BASE = required("R2_PUBLIC_URL").replace(/\/$/, "");

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY")
);

type Preset = "floor" | "peek";
const PRESETS: Record<Preset, { w: number; h: number; quality: number }> = {
  floor: { w: 1600, h: 1000, quality: 85 },
  peek: { w: 1280, h: 720, quality: 85 },
};

type Result = {
  newUrl: string;
  beforeBytes: number;
  afterBytes: number;
};

async function compressOne(
  originalUrl: string,
  preset: Preset
): Promise<Result> {
  if (!originalUrl.startsWith(`${PUBLIC_BASE}/`)) {
    throw new Error(`URL not on R2 public base: ${originalUrl}`);
  }
  const oldKey = originalUrl.slice(PUBLIC_BASE.length + 1);

  const res = await fetch(originalUrl);
  if (!res.ok) throw new Error(`Download ${res.status} ${res.statusText}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const beforeBytes = bytes.length;

  const { w, h, quality } = PRESETS[preset];
  const compressed = await sharp(bytes)
    .rotate() // honor EXIF orientation
    .resize(w, h, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  const newKey = `${oldKey.replace(/\.[a-z0-9]+$/i, "")}.webp`;
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: compressed,
      ContentType: "image/webp",
    })
  );

  return {
    newUrl: `${PUBLIC_BASE}/${newKey}`,
    beforeBytes,
    afterBytes: compressed.length,
  };
}

function fmt(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  // Floors --------------------------------------------------------
  const { data: floors, error: fErr } = await supabase
    .from("floors")
    .select("id, name, birds_eye_url, maps(name)")
    .not("birds_eye_url", "is", null);
  if (fErr) throw fErr;

  console.log(`Floors with bird's-eye images: ${floors?.length ?? 0}`);
  for (const f of (floors ?? []) as Array<{
    id: string;
    name: string;
    birds_eye_url: string;
    maps: { name: string } | null;
  }>) {
    const label = `${f.maps?.name ?? "?"} ${f.name}`;
    if (f.birds_eye_url.endsWith(".webp")) {
      console.log(`  skip ${label} (already .webp)`);
      skipped++;
      continue;
    }
    try {
      const r = await compressOne(f.birds_eye_url, "floor");
      const { error: uErr } = await supabase
        .from("floors")
        .update({ birds_eye_url: r.newUrl })
        .eq("id", f.id);
      if (uErr) throw uErr;
      totalBefore += r.beforeBytes;
      totalAfter += r.afterBytes;
      processed++;
      console.log(`  ok   ${label}: ${fmt(r.beforeBytes)} -> ${fmt(r.afterBytes)}`);
    } catch (e) {
      errors++;
      console.error(`  err  ${label}:`, e instanceof Error ? e.message : e);
    }
  }

  // Peeks ---------------------------------------------------------
  const { data: peeks, error: pErr } = await supabase
    .from("peeks")
    .select("id, name, poster_url")
    .not("poster_url", "is", null);
  if (pErr) throw pErr;

  console.log(`\nPeeks with posters: ${peeks?.length ?? 0}`);
  for (const p of (peeks ?? []) as Array<{
    id: string;
    name: string;
    poster_url: string;
  }>) {
    if (p.poster_url.endsWith(".webp")) {
      console.log(`  skip ${p.name} (already .webp)`);
      skipped++;
      continue;
    }
    try {
      const r = await compressOne(p.poster_url, "peek");
      const { error: uErr } = await supabase
        .from("peeks")
        .update({ poster_url: r.newUrl })
        .eq("id", p.id);
      if (uErr) throw uErr;
      totalBefore += r.beforeBytes;
      totalAfter += r.afterBytes;
      processed++;
      console.log(`  ok   ${p.name}: ${fmt(r.beforeBytes)} -> ${fmt(r.afterBytes)}`);
    } catch (e) {
      errors++;
      console.error(`  err  ${p.name}:`, e instanceof Error ? e.message : e);
    }
  }

  // Summary -------------------------------------------------------
  console.log(`\n=== Summary ===`);
  console.log(`Processed:  ${processed}`);
  console.log(`Skipped:    ${skipped} (already .webp)`);
  console.log(`Errors:     ${errors}`);
  if (processed > 0) {
    console.log(`Before:     ${fmt(totalBefore)}`);
    console.log(`After:      ${fmt(totalAfter)}`);
    const saved = totalBefore - totalAfter;
    const pct =
      totalBefore > 0 ? Math.round((saved / totalBefore) * 100) : 0;
    console.log(`Saved:      ${fmt(saved)} (${pct}%)`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
