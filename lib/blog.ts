import { supabasePublic } from "./supabase";
import type { Floor, Map, Peek } from "./db";

export const MIN_PEEKS_FOR_ARTICLE = 3;
export const BLOG_BASE_URL = "https://peekaboor6.com";
const ARTICLE_PREFIX = "best-spawn-peeks-";

export function articleSlugFor(mapSlug: string): string {
  return `${ARTICLE_PREFIX}${mapSlug}`;
}

export function mapSlugFromArticle(articleSlug: string): string | null {
  if (!articleSlug.startsWith(ARTICLE_PREFIX)) return null;
  const rest = articleSlug.slice(ARTICLE_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

export type BlogPeek = Peek & {
  created_at: string;
  floor: { id: string; slug: string; name: string };
};

export type EligibleMap = {
  map: Map;
  peekCount: number;
  floorCount: number;
};

type FloorBucket = {
  floor: BlogPeek["floor"];
  count: number;
};

type VerticalShape = "flat" | "concentrated" | "spread";
type SuccessSpread = "tight" | "moderate" | "wide";
type RiskShape = "low-heavy" | "mid-heavy" | "high-heavy" | "balanced";

export type Fingerprint = {
  map: Map;
  floors: Floor[];
  peeks: BlogPeek[];
  peekCount: number;
  floorCount: number;
  floorsWithPeeksCount: number;
  floorBuckets: FloorBucket[];
  busiestFloor: FloorBucket;
  busiestFloorShare: number; // 0..1
  verticalShape: VerticalShape;
  topPeek: BlogPeek;
  bottomPeek: BlogPeek;
  successRange: number;
  successSpread: SuccessSpread;
  avgDifficulty: number;
  difficultyMin: number;
  difficultyMax: number;
  difficultySpread: number;
  easiestPeek: BlogPeek;
  countByRisk: Record<BlogPeek["risk"], number>;
  dominantRisk: BlogPeek["risk"];
  riskShape: RiskShape;
  newestPeek: BlogPeek;
  oldestPeek: BlogPeek;
};

export type ArticleData = {
  map: Map;
  floors: Floor[];
  peeks: BlogPeek[];
  intro: string;
  why: string;
  sections: Array<{ heading: string; body: string }>;
  outro: string;
  faq: Array<{ q: string; a: string }>;
  fingerprint: Fingerprint;
  publishedDate: string; // ISO
  modifiedDate: string; // ISO
};

const PEEK_COLUMNS_WITH_TIME =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, peek_type, published, created_at, floors(id, slug, name)";

// --- queries ---

export async function listEligibleMaps(): Promise<EligibleMap[]> {
  const sb = supabasePublic();
  const { data: maps, error: mapsErr } = await sb
    .from("maps")
    .select("id, slug, name, published, cover_image_url")
    .eq("published", true)
    .order("name", { ascending: true });
  if (mapsErr) throw mapsErr;

  const { data: peeks, error: peeksErr } = await sb
    .from("peeks")
    .select("floor_id, floors!inner(map_id)")
    .eq("published", true);
  if (peeksErr) throw peeksErr;

  const peekCountByMap = new Map<string, number>();
  const floorIdsByMap = new Map<string, Set<string>>();
  for (const row of (peeks ?? []) as unknown as Array<{
    floor_id: string;
    floors: { map_id: string };
  }>) {
    const mapId = row.floors?.map_id;
    if (!mapId) continue;
    peekCountByMap.set(mapId, (peekCountByMap.get(mapId) ?? 0) + 1);
    let floorSet = floorIdsByMap.get(mapId);
    if (!floorSet) {
      floorSet = new Set();
      floorIdsByMap.set(mapId, floorSet);
    }
    floorSet.add(row.floor_id);
  }

  return (maps ?? [])
    .map((m) => ({
      map: m as Map,
      peekCount: peekCountByMap.get(m.id) ?? 0,
      floorCount: floorIdsByMap.get(m.id)?.size ?? 0,
    }))
    .filter((e) => e.peekCount >= MIN_PEEKS_FOR_ARTICLE);
}

export async function loadArticleData(
  mapSlug: string
): Promise<ArticleData | null> {
  const sb = supabasePublic();

  const { data: mapRow, error: mapErr } = await sb
    .from("maps")
    .select("id, slug, name, published, cover_image_url")
    .eq("slug", mapSlug)
    .maybeSingle();
  if (mapErr) throw mapErr;
  if (!mapRow || !mapRow.published) return null;
  const map = mapRow as Map;

  const { data: floors, error: floorsErr } = await sb
    .from("floors")
    .select("id, map_id, slug, name, display_order, birds_eye_url")
    .eq("map_id", map.id)
    .order("display_order", { ascending: true });
  if (floorsErr) throw floorsErr;

  const floorIds = (floors ?? []).map((f) => f.id);
  if (floorIds.length === 0) return null;

  const { data: peeksRaw, error: peeksErr } = await sb
    .from("peeks")
    .select(PEEK_COLUMNS_WITH_TIME)
    .in("floor_id", floorIds)
    .eq("published", true)
    .order("success_rate", { ascending: false });
  if (peeksErr) throw peeksErr;

  const peeks = ((peeksRaw ?? []) as unknown as Array<
    Peek & {
      created_at: string;
      floors: { id: string; slug: string; name: string } | null;
    }
  >)
    .filter((p) => p.floors)
    .map((p) => ({
      ...p,
      floor: p.floors as { id: string; slug: string; name: string },
    })) as BlogPeek[];

  if (peeks.length < MIN_PEEKS_FOR_ARTICLE) return null;

  const fingerprint = computeFingerprint(map, (floors ?? []) as Floor[], peeks);

  const intro = renderIntro(fingerprint);
  const why = renderWhy(fingerprint);
  const sections = renderSections(fingerprint);
  const outro = renderOutro(fingerprint);
  const faq = renderFaq(fingerprint);

  const oldestCreated = fingerprint.oldestPeek.created_at;
  const newestCreated = fingerprint.newestPeek.created_at;

  return {
    map,
    floors: (floors ?? []) as Floor[],
    peeks,
    intro,
    why,
    sections,
    outro,
    faq,
    fingerprint,
    publishedDate: oldestCreated,
    modifiedDate: newestCreated,
  };
}

// --- fingerprint ---
//
// Each map's article must be unique because the data is unique, not because
// of cosmetic word swaps. The fingerprint captures the per-map "shape" that
// the prose generators below pivot on: how peeks distribute across floors,
// the success-rate spread, the dominant risk class, and so on. Different
// fingerprints produce different sentence openers, different sections, and
// different FAQ items.

function computeFingerprint(
  map: Map,
  floors: Floor[],
  peeks: BlogPeek[]
): Fingerprint {
  const peekCount = peeks.length;
  const floorCount = floors.length;

  const floorOrderIndex = new Map(floors.map((f, i) => [f.id, i] as const));
  const byFloor = new Map<string, FloorBucket>();
  for (const p of peeks) {
    const existing = byFloor.get(p.floor.id);
    if (existing) existing.count += 1;
    else byFloor.set(p.floor.id, { floor: p.floor, count: 1 });
  }
  const floorBuckets = Array.from(byFloor.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (
      (floorOrderIndex.get(a.floor.id) ?? 0) -
      (floorOrderIndex.get(b.floor.id) ?? 0)
    );
  });
  const busiestFloor = floorBuckets[0];
  const busiestFloorShare = busiestFloor.count / peekCount;
  const floorsWithPeeksCount = floorBuckets.length;

  let verticalShape: VerticalShape;
  if (floorsWithPeeksCount <= 1) verticalShape = "flat";
  else if (busiestFloorShare >= 0.6) verticalShape = "concentrated";
  else verticalShape = "spread";

  const topPeek = peeks[0];
  const bottomPeek = peeks[peeks.length - 1];
  const successRange = topPeek.success_rate - bottomPeek.success_rate;
  let successSpread: SuccessSpread;
  if (successRange < 15) successSpread = "tight";
  else if (successRange < 30) successSpread = "moderate";
  else successSpread = "wide";

  const difficulties = peeks.map((p) => p.difficulty);
  const avgDifficulty =
    difficulties.reduce((s, d) => s + d, 0) / peekCount;
  const difficultyMin = Math.min(...difficulties);
  const difficultyMax = Math.max(...difficulties);
  const difficultySpread = difficultyMax - difficultyMin;

  let easiestPeek = peeks[0];
  for (const p of peeks) {
    if (
      p.difficulty < easiestPeek.difficulty ||
      (p.difficulty === easiestPeek.difficulty &&
        p.success_rate > easiestPeek.success_rate)
    ) {
      easiestPeek = p;
    }
  }

  const countByRisk: Record<BlogPeek["risk"], number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const p of peeks) countByRisk[p.risk] += 1;
  const sortedRisks = (
    Object.entries(countByRisk) as Array<[BlogPeek["risk"], number]>
  ).sort((a, b) => b[1] - a[1]);
  const dominantRisk = sortedRisks[0][0];
  const dominantShare = sortedRisks[0][1] / peekCount;
  let riskShape: RiskShape;
  if (dominantShare < 0.55) riskShape = "balanced";
  else if (dominantRisk === "low") riskShape = "low-heavy";
  else if (dominantRisk === "medium") riskShape = "mid-heavy";
  else riskShape = "high-heavy";

  let newestPeek = peeks[0];
  let oldestPeek = peeks[0];
  for (const p of peeks) {
    if (p.created_at > newestPeek.created_at) newestPeek = p;
    if (p.created_at < oldestPeek.created_at) oldestPeek = p;
  }

  return {
    map,
    floors,
    peeks,
    peekCount,
    floorCount,
    floorsWithPeeksCount,
    floorBuckets,
    busiestFloor,
    busiestFloorShare,
    verticalShape,
    topPeek,
    bottomPeek,
    successRange,
    successSpread,
    avgDifficulty,
    difficultyMin,
    difficultyMax,
    difficultySpread,
    easiestPeek,
    countByRisk,
    dominantRisk,
    riskShape,
    newestPeek,
    oldestPeek,
  };
}

// --- prose generators ---

const RISK_LABELS: Record<BlogPeek["risk"], string> = {
  low: "low-risk",
  medium: "calculated",
  high: "high-risk",
};

const RISK_NOUN: Record<BlogPeek["risk"], string> = {
  low: "low-risk hold",
  medium: "calculated play",
  high: "high-risk lean",
};

function pct(share: number): number {
  return Math.round(share * 100);
}

function joinTopFloors(buckets: FloorBucket[], limit = 2): string {
  const slice = buckets.slice(0, limit);
  if (slice.length === 1) {
    return `${slice[0].count} on ${slice[0].floor.name}`;
  }
  if (slice.length === 2) {
    return `${slice[0].count} on ${slice[0].floor.name} and ${slice[1].count} on ${slice[1].floor.name}`;
  }
  const head = slice.slice(0, -1).map((b) => `${b.count} on ${b.floor.name}`);
  const tail = slice[slice.length - 1];
  return `${head.join(", ")}, and ${tail.count} on ${tail.floor.name}`;
}

function fullFloorBreakdown(buckets: FloorBucket[]): string {
  return buckets.map((b) => `${b.count} on ${b.floor.name}`).join(", ");
}

function renderIntro(fp: Fingerprint): string {
  return `${pickIntroOpener(fp)}\n\n${renderIntroDetail(fp)}`;
}

function pickIntroOpener(fp: Fingerprint): string {
  const {
    map,
    peekCount,
    floorCount,
    busiestFloor,
    busiestFloorShare,
    verticalShape,
    topPeek,
    bottomPeek,
    successRange,
    successSpread,
    floorBuckets,
  } = fp;

  if (verticalShape === "concentrated" && busiestFloorShare >= 0.7) {
    return `Of the ${peekCount} documented spawn peeks on ${map.name}, ${busiestFloor.count} sit on ${busiestFloor.floor.name} — ${pct(busiestFloorShare)}% of the map's defender pressure comes off a single floor. That concentration is the most important thing to know about playing or counter-playing ${map.name}'s spawn: own ${busiestFloor.floor.name}'s windows and you control round one; cede them and the attacking team gets punished before it ever reaches the building.`;
  }

  if (verticalShape === "flat") {
    return `Every documented spawn peek on ${map.name} plays out on one floor: all ${peekCount} angles in this guide live on ${busiestFloor.floor.name}. There is no vertical layer for attackers to neutralize with utility and no upper-floor cross-map sightline to clear — just a horizontal pressure problem where defenders pick a window and attackers pick a lane. That makes ${map.name} one of the more readable maps in the spawn-peek meta, and one where a single bad rotation gets the entire attacking team chunked.`;
  }

  if (verticalShape === "spread") {
    return `${map.name} spreads its ${peekCount} documented spawn peeks across ${fp.floorsWithPeeksCount} floors — ${joinTopFloors(floorBuckets, 2)}${floorBuckets.length > 2 ? `, with the remaining ${peekCount - floorBuckets[0].count - floorBuckets[1].count} on ${floorBuckets.slice(2).map((b) => b.floor.name).join(" and ")}` : ""}. No single floor dominates, so attackers have to clear angles in more than one direction on the way to the objective, and defenders cannot just lock down one window and call it a setup.`;
  }

  if (successSpread === "wide") {
    return `${map.name}'s spawn peek pool runs from ${topPeek.name} at ${topPeek.success_rate}% down to ${bottomPeek.name} at ${bottomPeek.success_rate}% — a ${successRange}-point spread that tells you which angles are worth drilling and which are coin flips. ${peekCount} angles across ${floorCount} ${floorCount === 1 ? "floor" : "floors"} are documented below, with community vote counts attached to every entry so you can see how settled each success rate actually is.`;
  }

  return `${map.name} carries ${peekCount} documented spawn peek angles across ${floorCount} ${floorCount === 1 ? "floor" : "floors"}, led by ${topPeek.name} at ${topPeek.success_rate}% community-tested success. The map's defender setups still revolve around catching attackers in the opening seconds of the round, before utility lands and before the attacking team can call out the angle.`;
}

function renderIntroDetail(fp: Fingerprint): string {
  const {
    map,
    peekCount,
    topPeek,
    bottomPeek,
    successRange,
    countByRisk,
    riskShape,
  } = fp;

  let riskClause: string;
  if (riskShape === "balanced") {
    riskClause = `The risk mix is split (${countByRisk.low} low-risk, ${countByRisk.medium} calculated, ${countByRisk.high} high-risk), so ${map.name} accommodates careful holders and aggressive lean players in roughly equal measure.`;
  } else if (riskShape === "low-heavy") {
    riskClause = `${countByRisk.low} of the ${peekCount} angles are low-risk holds rather than aggressive leans, which means ${map.name}'s pool skews toward plays you can fold into a defender routine without trading yourself.`;
  } else if (riskShape === "mid-heavy") {
    riskClause = `${countByRisk.medium} of the ${peekCount} angles are calculated plays — neither freebies nor suicide leans — making ${map.name} one of the more skill-expressive spawn-peek maps in the rotation.`;
  } else {
    riskClause = `${countByRisk.high} of the ${peekCount} angles are classed high-risk, so ${map.name} punishes defenders who hold the wrong window for too long but rewards the ones who time the step-out cleanly.`;
  }

  const bottomClause =
    successRange > 0 && topPeek.id !== bottomPeek.id
      ? `, with ${bottomPeek.name} at the floor of the list at ${bottomPeek.success_rate}%`
      : "";

  return `Every angle below is ranked by community success rate. ${topPeek.name} leads at ${topPeek.success_rate}%${bottomClause}. ${riskClause}`;
}

function renderWhy(fp: Fingerprint): string {
  const {
    map,
    verticalShape,
    busiestFloor,
    peekCount,
    floorBuckets,
    avgDifficulty,
    difficultyMin,
    difficultyMax,
    riskShape,
    dominantRisk,
    countByRisk,
  } = fp;

  let lead: string;
  if (verticalShape === "concentrated") {
    lead = `${map.name}'s spawn peek meta lives or dies on ${busiestFloor.floor.name}. ${busiestFloor.count} of the ${peekCount} angles in this guide come off that one floor, which means a coordinated attacking team that clears ${busiestFloor.floor.name} early shuts down most of the map's spawn pressure in a single move.`;
  } else if (verticalShape === "flat") {
    lead = `${map.name} does not have the vertical complexity of maps like Chalet or Clubhouse — every spawn peek in this guide plays out at one elevation on ${busiestFloor.floor.name}. That keeps the read simple for attackers (clear the windows facing your spawn) and forces defenders to compete for a small number of strong horizontal sightlines.`;
  } else {
    lead = `${map.name} forces attackers to clear angles on more than one floor before they reach the objective. The ${peekCount} documented peeks are spread across ${fp.floorsWithPeeksCount} floors, with ${joinTopFloors(floorBuckets, 2)} — no single floor is the whole story, and defender setups change meaningfully depending on which floor takes the round-one peek.`;
  }

  let trail: string;
  if (riskShape === "high-heavy") {
    trail = `The pool also skews ${RISK_LABELS[dominantRisk]} (${countByRisk[dominantRisk]} of ${peekCount} angles), which is why average difficulty sits at ${avgDifficulty.toFixed(1)}/5. These are not beginner holds — they are plays that demand exact step-out timing.`;
  } else if (riskShape === "low-heavy") {
    trail = `Most of these angles are low-risk holds rather than aggressive leans (${countByRisk.low} of ${peekCount}), which keeps the average difficulty at ${avgDifficulty.toFixed(1)}/5. Anyone learning ${map.name} can fold one of these into their defender routine without overcommitting.`;
  } else if (riskShape === "mid-heavy") {
    trail = `Average difficulty sits at ${avgDifficulty.toFixed(1)}/5, with most of the pool classed as calculated plays rather than freebies or suicide leans. ${map.name}'s spawn peeks reward defenders who have put time into specific step-out timings.`;
  } else {
    trail = `Difficulties span ${difficultyMin}/5 up to ${difficultyMax}/5 and the risk profile is split, so there is something here whether you are brand new to ${map.name} or grinding the angles in ranked.`;
  }

  return `${lead} ${trail}`;
}

// Variable sections — included only when the data motivates them.
function renderSections(
  fp: Fingerprint
): Array<{ heading: string; body: string }> {
  const sections: Array<{ heading: string; body: string }> = [];

  if (fp.floorsWithPeeksCount >= 2) {
    sections.push(renderFloorPressureSection(fp));
  }
  if (fp.successSpread === "wide" && fp.topPeek.id !== fp.bottomPeek.id) {
    sections.push(renderSuccessRangeSection(fp));
  }
  if (fp.riskShape !== "balanced") {
    sections.push(renderRiskProfileSection(fp));
  }

  return sections;
}

function renderFloorPressureSection(fp: Fingerprint): {
  heading: string;
  body: string;
} {
  const { map, floorBuckets, peekCount, verticalShape, busiestFloor } = fp;
  const breakdown = fullFloorBreakdown(floorBuckets);
  const heading = `How spawn peeks distribute across ${map.name}'s floors`;
  let body: string;
  if (verticalShape === "concentrated") {
    body = `${breakdown}. With ${pct(fp.busiestFloorShare)}% of ${map.name}'s documented angles sitting on ${busiestFloor.floor.name}, that floor is the single piece of real estate both teams should plan around. Attacking teams that pre-clear ${busiestFloor.floor.name} with utility on the way out of spawn neutralize most of the map's peek pressure; defenders who skip it give up the round-one initiative.`;
  } else {
    body = `${breakdown}. The peek count is genuinely distributed across ${map.name}, which means attackers cannot prefire one direction and call it good — and defenders should rotate their peek floor round to round so the attacking team cannot anticipate where the lean is coming from. Of the ${peekCount} angles, no single floor accounts for more than ${pct(fp.busiestFloorShare)}%.`;
  }
  return { heading, body };
}

function renderSuccessRangeSection(fp: Fingerprint): {
  heading: string;
  body: string;
} {
  const { map, topPeek, bottomPeek, successRange, peeks } = fp;
  const heading = `The success-rate spread on ${map.name}`;
  const median = peeks[Math.floor(peeks.length / 2)];
  const body = `${topPeek.name} hits ${topPeek.success_rate}% at the top of the list while ${bottomPeek.name} sits at ${bottomPeek.success_rate}% at the bottom — a ${successRange}-point gap that tells you the documented pool is not uniformly strong. The median angle (${median.name}) lands at ${median.success_rate}%, which is a reasonable cutoff: angles above it are worth drilling, angles below should only be picked when you specifically need to surprise an attacking team that has scouted the top of the list.`;
  return { heading, body };
}

function renderRiskProfileSection(fp: Fingerprint): {
  heading: string;
  body: string;
} {
  const { map, dominantRisk, countByRisk, peekCount, avgDifficulty } = fp;
  const heading = `${map.name}'s risk-reward signature`;
  const share = pct(countByRisk[dominantRisk] / peekCount);
  let explanation: string;
  if (dominantRisk === "high") {
    explanation = `${map.name}'s exterior geometry exposes defenders to multiple counter-angles the moment they commit, which is why so many documented plays trade safety for the chance at an opening-seconds kill. Expect to die if your timing is off, and expect to win the round when it is on.`;
  } else if (dominantRisk === "low") {
    explanation = `${map.name}'s defender positions tend to offer clean step-back paths when a lean does not connect, which is why most documented angles can be held with limited downside. These are repeatable holds rather than coinflips.`;
  } else {
    explanation = `${map.name}'s sightlines reward defenders who pick controlled, repeatable timings over high-risk leans or pure hold-and-wait setups. Expect to use your utility (cameras, sound cues) more than your reflexes on these angles.`;
  }
  const body = `${countByRisk[dominantRisk]} of ${peekCount} angles (${share}%) fall in the ${dominantRisk}-risk bucket, and average difficulty sits at ${avgDifficulty.toFixed(1)}/5. ${explanation}`;
  return { heading, body };
}

function renderOutro(fp: Fingerprint): string {
  const { map, verticalShape, busiestFloor } = fp;

  let first: string;
  if (verticalShape === "concentrated") {
    first = `Spawn peeks on ${map.name} reward defenders who treat ${busiestFloor.floor.name} as their primary real estate. Pick one or two of the angles above off that floor, drill the exact step-out timing, and rotate off the moment attackers commit utility — predictable lean patterns are the fastest way to give the round back.`;
  } else if (verticalShape === "flat") {
    first = `${map.name}'s spawn peeks reward repetition more than vertical creativity. Pick two angles that cover different attacker approach lanes, drill them in custom games, and resist the urge to lean every round — without verticality to fall back on, defenders who over-peek get prefired the moment attackers catch the pattern.`;
  } else {
    first = `Because ${map.name}'s peeks span multiple floors, varying the peek floor round to round is more punishing for the attacking team than committing to a single floor's hold. Drill one angle per floor, rotate which you use, and read the attacking team's approach side before you commit.`;
  }

  const second = `Community success rates shift as Ubisoft adjusts map geometry and as the meta moves; the database below updates whenever players submit new data. Ready to see exactly where each pin sits? Open the interactive ${map.name} map at /maps/${map.slug} for the top-down view with a video clip on every angle.`;

  return `${first}\n\n${second}`;
}

function renderFaq(fp: Fingerprint): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  const {
    map,
    peekCount,
    floorsWithPeeksCount,
    busiestFloor,
    busiestFloorShare,
    topPeek,
    easiestPeek,
    avgDifficulty,
    difficultyMin,
    difficultyMax,
    countByRisk,
    riskShape,
    dominantRisk,
    verticalShape,
    floorBuckets,
  } = fp;

  out.push({
    q: `What's the highest-success-rate spawn peek on ${map.name}?`,
    a: `${topPeek.name} on ${topPeek.floor.name} leads the ${map.name} database at ${topPeek.success_rate}% across ${topPeek.vote_count} community ${topPeek.vote_count === 1 ? "report" : "reports"}. It's a ${RISK_NOUN[topPeek.risk]} with a difficulty of ${topPeek.difficulty}/5 — see the full breakdown above for the step-out sequence.`,
  });

  out.push({
    q: `How many spawn peeks are documented on ${map.name}?`,
    a: `${peekCount} viable, published angles are tracked — ${fullFloorBreakdown(floorBuckets)}. New angles are added as the community reports them.`,
  });

  if (floorsWithPeeksCount >= 2) {
    const sentence2 =
      verticalShape === "concentrated"
        ? `That's the floor an attacking team has to clear first — every other documented angle on ${map.name} is a secondary read.`
        : `It is the busiest floor, but not the whole story — the remaining angles spread across other floors.`;
    out.push({
      q: `Which floor on ${map.name} has the most spawn peeks?`,
      a: `${busiestFloor.floor.name} holds ${busiestFloor.count} of the ${peekCount} documented angles (${pct(busiestFloorShare)}% of the pool). ${sentence2}`,
    });
  }

  const easiestClause =
    difficultyMax > difficultyMin
      ? `Start with ${easiestPeek.name} on ${easiestPeek.floor.name} — at ${easiestPeek.difficulty}/5 it's the lowest-friction entry into ${map.name}'s spawn-peek pool.`
      : `Every documented angle shares the same difficulty class, so pick by success rate rather than execution effort.`;
  out.push({
    q: `How hard are ${map.name}'s spawn peeks to learn?`,
    a: `Average difficulty across the pool sits at ${avgDifficulty.toFixed(1)}/5, ranging from ${difficultyMin}/5 to ${difficultyMax}/5. ${easiestClause}`,
  });

  if (riskShape !== "balanced") {
    let explanation: string;
    if (dominantRisk === "high") {
      explanation = `${map.name}'s exterior geometry exposes defenders to multiple counter-angles the moment they commit, so most documented plays trade safety for the chance at an opening-seconds kill.`;
    } else if (dominantRisk === "low") {
      explanation = `${map.name}'s defender positions tend to give clean step-back paths when the lean doesn't connect, so most documented angles can be held with limited downside.`;
    } else {
      explanation = `${map.name}'s sightlines reward defenders who pick controlled, repeatable timings rather than high-risk leans or pure hold-and-wait setups.`;
    }
    out.push({
      q: `Why are most spawn peeks on ${map.name} classed ${RISK_LABELS[dominantRisk]}?`,
      a: `${countByRisk[dominantRisk]} of ${peekCount} angles fall in the ${dominantRisk}-risk bucket. ${explanation}`,
    });
  }

  return out;
}

export function peekLeadIn(peek: BlogPeek): string {
  const rate = peek.success_rate;
  const variant = simpleHash(peek.slug) % 4;
  const floorName = peek.floor.name;
  const votes = peek.vote_count;
  const votesText = `${votes} community ${votes === 1 ? "report" : "reports"}`;
  switch (variant) {
    case 0:
      return `${peek.name} is a ${RISK_NOUN[peek.risk]} with a ${rate}% community-tested success rate. It works best for defenders who can commit to the angle the moment the round timer hits zero.`;
    case 1:
      return `If you're hunting round-one impact on ${floorName}, ${peek.name} is one of the more reliable options — ${rate}% success rate across ${votesText}, with a difficulty of ${peek.difficulty}/5.`;
    case 2:
      return `${peek.name} takes practice to execute cleanly, but its ${rate}% success rate explains why advanced players keep coming back to it. Difficulty sits at ${peek.difficulty}/5 and the angle is classed as a ${RISK_NOUN[peek.risk]}.`;
    default:
      return `${peek.name} pulls a ${rate}% success rate out of ${floorName}. ${
        peek.tip
          ? `Tip from the community: ${peek.tip}`
          : `It's a ${RISK_NOUN[peek.risk]} that rewards players who learn the exact step-out timing.`
      }`;
  }
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- index excerpt ---
//
// Generated directly from the fingerprint so each map's blog index card
// leads with its own distinctive fact (concentration, spread, top angle)
// instead of a templated first sentence.
export function articleExcerpt(data: ArticleData): string {
  const fp = data.fingerprint;
  const { map, peekCount, busiestFloor, busiestFloorShare, verticalShape, topPeek, floorBuckets, successRange, bottomPeek } = fp;

  if (verticalShape === "concentrated") {
    return `${peekCount} peeks, ${busiestFloor.count} on ${busiestFloor.floor.name} — ${pct(busiestFloorShare)}% of ${map.name}'s spawn pressure comes off one floor. Top angle: ${topPeek.name} at ${topPeek.success_rate}%.`;
  }
  if (verticalShape === "flat") {
    return `${peekCount} peeks, all on ${busiestFloor.floor.name} — ${map.name}'s spawn-peek game is a horizontal-pressure problem. Top angle: ${topPeek.name} at ${topPeek.success_rate}%.`;
  }
  // spread
  if (successRange >= 30 && topPeek.id !== bottomPeek.id) {
    return `${peekCount} peeks across ${fp.floorsWithPeeksCount} floors on ${map.name}. Success rates run from ${topPeek.success_rate}% (${topPeek.name}) down to ${bottomPeek.success_rate}% — pick from the top of the list.`;
  }
  return `${peekCount} peeks spread across ${fp.floorsWithPeeksCount} floors on ${map.name} — ${joinTopFloors(floorBuckets, 2)}. Top angle: ${topPeek.name} at ${topPeek.success_rate}%.`;
}
