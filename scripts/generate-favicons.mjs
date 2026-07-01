/**
 * Renders /public/icon-source.svg to the favicon / app-icon PNGs the site
 * needs, then bundles the 16/32/48 PNGs into a multi-resolution favicon.ico.
 *
 * icon-source.svg is the peekabooR6 mark in the theme accent (#f2640e), kept
 * separate from logo.svg (the header logo, which stays #ff6a00) so favicons
 * follow the theme while the header logo is fixed.
 *
 * Run: npm run generate-favicons
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
const svgPath = resolve(publicDir, "icon-source.svg");

const SIZES = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "favicon-48x48.png": 48,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
};

const svg = await readFile(svgPath);

for (const [filename, size] of Object.entries(SIZES)) {
  const out = resolve(publicDir, filename);
  const buf = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  await writeFile(out, buf);
  console.log(`✓ ${filename.padEnd(22)} ${buf.length.toLocaleString()} bytes`);
}

const icoBuf = await pngToIco([
  resolve(publicDir, "favicon-16x16.png"),
  resolve(publicDir, "favicon-32x32.png"),
  resolve(publicDir, "favicon-48x48.png"),
]);
await writeFile(resolve(publicDir, "favicon.ico"), icoBuf);
console.log(`✓ ${"favicon.ico".padEnd(22)} ${icoBuf.length.toLocaleString()} bytes`);
