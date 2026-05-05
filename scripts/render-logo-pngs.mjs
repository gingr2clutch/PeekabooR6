// One-shot helper: rasterise the three logo SVGs into 512px PNGs in /public.
// Run with `node scripts/render-logo-pngs.mjs`. Sharp must be installed.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

async function render(name, height) {
  const svg = readFileSync(join(publicDir, `${name}.svg`));
  // Square marks render at 512x512; the wordmark logo keeps aspect ratio
  // (256:64 → 512x128) so the text doesn't squash.
  const buf = await sharp(svg, { density: 600 })
    .resize({ height })
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, `${name}.png`), buf);
  console.log(`wrote ${name}.png`);
}

await render("logo-mark", 512);
await render("logo-white", 512);
await render("logo", 128);
