/**
 * One-off: fetch the primary product image URL for each /gear ASIN by
 * scraping the public product page's social-share metadata. Output is JSON
 * keyed by ASIN — copy/paste into app/gear/page.tsx.
 *
 * Run:
 *   node scripts/fetch-product-images.mjs
 */

const ASINS = [
  "B07CMS5Q6P", // Logitech LIGHTSPEED mouse
  "B0D14N2QZF", // F75 Pro keyboard
  "B0CYWFH5Y9", // Turtle Beach Stealth headset
  "B0C7GW9F88", // GameSir G7 SE controller
  "B016P0BVH4", // KontrolFreek Galaxy thumbsticks
];

// A real desktop Chrome UA. Amazon serves a stripped-down page (no
// data-a-dynamic-image, no og:image) to obvious bot UAs.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchImage(asin) {
  const url = `https://www.amazon.com/dp/${asin}`;
  let res;
  try {
    res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  } catch (e) {
    return { asin, error: `fetch threw: ${e.message}` };
  }
  if (!res.ok) {
    return { asin, error: `HTTP ${res.status}`, finalUrl: res.url };
  }
  const html = await res.text();

  // 1. og:image — the cleanest, social-share metadata field.
  const og =
    html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i
    );
  if (og?.[1]) {
    return { asin, url: og[1], src: "og:image" };
  }

  // 2. landingImage data-a-dynamic-image: a JSON object of url→[w,h].
  //    Pick the largest area.
  const dyn = html.match(
    /id=["']landingImage["'][^>]*data-a-dynamic-image=["']([^"']+)["']/i
  );
  if (dyn?.[1]) {
    try {
      const decoded = dyn[1]
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, "&");
      const parsed = JSON.parse(decoded);
      let best = null;
      let bestArea = 0;
      for (const [u, dims] of Object.entries(parsed)) {
        if (!Array.isArray(dims) || dims.length < 2) continue;
        const area = dims[0] * dims[1];
        if (area > bestArea) {
          best = u;
          bestArea = area;
        }
      }
      if (best) return { asin, url: best, src: "landingImage" };
    } catch (e) {
      // fall through
    }
  }

  // 3. #imgTagWrapperId > img src
  const wrap = html.match(
    /id=["']imgTagWrapperId["'][^>]*>[\s\S]{0,500}?<img[^>]+src=["']([^"']+)["']/i
  );
  if (wrap?.[1]) return { asin, url: wrap[1], src: "imgTagWrapperId" };

  // 4. #main-image > src
  const main = html.match(
    /<img[^>]*id=["']main-image["'][^>]*src=["']([^"']+)["']/i
  );
  if (main?.[1]) return { asin, url: main[1], src: "main-image" };

  // Surface a fingerprint of what Amazon actually returned so we can debug
  // anti-bot pages (CAPTCHA, "Sorry…", login redirects).
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "(no title)";
  return {
    asin,
    error: "no image found in HTML",
    htmlLen: html.length,
    title,
    finalUrl: res.url,
  };
}

async function main() {
  const out = {};
  const failures = [];
  for (const asin of ASINS) {
    const r = await fetchImage(asin);
    if (r.url) {
      console.log(`OK  ${asin}  [${r.src}]  ${r.url}`);
      out[asin] = r.url;
    } else {
      console.log(`FAIL ${asin}  ${r.error}`);
      if (r.title) console.log(`     title: ${r.title}`);
      if (r.htmlLen) console.log(`     html length: ${r.htmlLen}`);
      if (r.finalUrl) console.log(`     final URL: ${r.finalUrl}`);
      failures.push(asin);
    }
    // Be polite — small gap between requests.
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log("\n--- JSON ---");
  console.log(JSON.stringify(out, null, 2));
  if (failures.length) {
    console.log(`\nMissing: ${failures.join(", ")}`);
    process.exit(1);
  }
}

main();
