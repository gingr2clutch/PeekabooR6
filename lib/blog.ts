import { supabasePublic } from "./supabase";
import type { Floor, Map, Peek } from "./db";
import { MEASURED_MIN_VOTES, rating, ratingScore, votesText } from "./rate";

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

export type ArticleData = {
  map: Map;
  floors: Floor[];
  peeks: BlogPeek[];
  topPeek: BlogPeek;
  countByRisk: Record<BlogPeek["risk"], number>;
  avgDifficulty: number;
  intro: string;
  why: string;
  outro: string;
  faq: Array<{ q: string; a: string }>;
  publishedDate: string; // ISO
  modifiedDate: string; // ISO
};

const PEEK_COLUMNS_WITH_TIME =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, worked_votes, success_rate, base_success_rate, published, created_at, floors(id, slug, name)";

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
    .order("base_success_rate", { ascending: false });
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

  const topPeek = peeks[0];
  const countByRisk: Record<BlogPeek["risk"], number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const p of peeks) countByRisk[p.risk] += 1;
  const avgDifficulty =
    peeks.reduce((sum, p) => sum + p.difficulty, 0) / peeks.length;

  const intro = renderIntro(map, peeks, floors ?? [], countByRisk);
  const why = renderWhy(map, peeks, countByRisk);
  const outro = renderOutro(map);
  const faq = renderFaq(map, peeks, avgDifficulty);

  const latestCreated = peeks.reduce(
    (acc, p) => (p.created_at > acc ? p.created_at : acc),
    peeks[0].created_at
  );

  return {
    map,
    floors: (floors ?? []) as Floor[],
    peeks,
    topPeek,
    countByRisk,
    avgDifficulty,
    intro,
    why,
    outro,
    faq,
    publishedDate: peeks[peeks.length - 1].created_at,
    modifiedDate: latestCreated,
  };
}

// --- prose generators ---
//
// The blog article must be substantially more than the /maps/<slug> tool
// page. Templated prose fills that gap: it reads naturally, draws on real
// data (top peek, risk distribution, floor count), and varies between
// maps so search engines don't see boilerplate.

const RISK_LABELS: Record<BlogPeek["risk"], string> = {
  low: "low-risk",
  medium: "calculated",
  high: "high-risk",
};

// Per-map opening sentence keyed by Supabase map.slug. Each guide leads
// with map-specific colour instead of the boilerplate "defining maps for
// spawn-side gunfights" line, which read as duplicate content across all
// the auto-generated /blog/best-spawn-peeks-<map> pages. Maps not listed
// here fall back to the original generic sentence inside renderIntro.
const MAP_INTROS: Record<string, string> = {
  oregon:
    "Every Oregon spawn peek, pinned to the floor map with clips and pro tips.",
  chalet:
    "All the best Chalet spawn peek angles, with floor map pins and clips.",
  clubhouse:
    "Clubhouse spawn peeks mapped out floor-by-floor, with clips and tips.",
  border:
    "Every spawn peek on Border, with floor map pins, clips, and community pro tips.",
  "nighthaven-labs":
    "The full Nighthaven Labs spawn peek guide — floor maps, clips, and pro tips.",
  consulate:
    "Spawn peeks for every angle on Consulate, pinned to the floor map with clips.",
};

function topPeekFloorName(peek: BlogPeek): string {
  return peek.floor.name;
}

// "Top rated by the community" language is only honest for a peek that has
// actually crossed the measured-vote threshold. Returns the highest-scoring
// measured peek, or null when none has enough votes.
function topMeasuredPeek(peeks: BlogPeek[]): BlogPeek | null {
  const measured = peeks.filter((p) => p.vote_count >= MEASURED_MIN_VOTES);
  if (measured.length === 0) return null;
  return [...measured].sort(
    (a, b) =>
      ratingScore(b.base_success_rate, b.worked_votes, b.vote_count) -
      ratingScore(a.base_success_rate, a.worked_votes, a.vote_count)
  )[0];
}

// peeks arrive ordered by base_success_rate desc, so peeks[0] is the standout
// estimate when no measured leader exists yet.
function topEstimatePeek(peeks: BlogPeek[]): BlogPeek {
  return peeks[0];
}

function peekGrade(peek: BlogPeek) {
  return rating(peek.base_success_rate, peek.worked_votes, peek.vote_count).grade;
}

function renderIntro(
  map: Map,
  peeks: BlogPeek[],
  floors: Floor[],
  countByRisk: Record<BlogPeek["risk"], number>
): string {
  const topMeasured = topMeasuredPeek(peeks);
  const topEstimate = topEstimatePeek(peeks);
  const peekCount = peeks.length;
  const floorCount = floors.length;
  const lowMed = countByRisk.low + countByRisk.medium;

  const lead =
    MAP_INTROS[map.slug] ??
    `${map.name} is one of Rainbow Six Siege's defining maps for spawn-side gunfights.`;

  const first = `${lead} ${peekCount} community-tested peek angles span its ${floorCount} ${floorCount === 1 ? "floor" : "floors"}, and they continue to determine who wins the opening seconds of a round. Defenders who learn even one of these can tilt round one in their favor; attackers who don't recognize the angles get punished crossing the spawn perimeter before they ever reach the building.`;

  const riskTail = `${countByRisk.high} of the documented angles fall into the high-risk bracket and demand precise timing, while the remaining ${lowMed} are reliable round-one openers. Whether you're learning ${map.name} from the attacking side or refining your defender setup, the breakdown below maps every peek to its floor, its difficulty, and its risk.`;

  // "Top rated by the community" language is only honest once a peek has real
  // votes. Until then we highlight the standout estimate's grade with neutral
  // framing. Either way the grade — never a percentage — is the figure shown.
  let second: string;
  if (topMeasured) {
    const r = rating(
      topMeasured.base_success_rate,
      topMeasured.worked_votes,
      topMeasured.vote_count
    ) as { tier: "measured"; grade: string; votes: number };
    second = `This guide breaks down every viable spawn peek on ${map.name}, ranked by community effectiveness grade. ${topMeasured.name} leads the list at grade ${r.grade} across ${votesText(r.votes)} — a ${RISK_LABELS[topMeasured.risk]} play out of ${topPeekFloorName(topMeasured)} that has paid off consistently for players willing to hold the angle. ${riskTail}`;
  } else {
    second = `This guide breaks down every viable spawn peek on ${map.name}, ordered by our effectiveness grade while community voting gets going. ${topEstimate.name} stands out at grade ${peekGrade(topEstimate)} out of ${topPeekFloorName(topEstimate)} — a ${RISK_LABELS[topEstimate.risk]} play worth learning first. ${riskTail}`;
  }

  return `${first}\n\n${second}`;
}

function renderWhy(
  map: Map,
  peeks: BlogPeek[],
  countByRisk: Record<BlogPeek["risk"], number>
): string {
  const top = peeks[0];
  return `The geometry of ${map.name}'s exterior turns the opening seconds into a tactical puzzle. Long sightlines from ${topPeekFloorName(top)}, narrow attacker approach lanes, and a handful of elevated defensive positions all favor the side that sets up first. Most spawn peeks on ${map.name} land their kill in the first ten seconds of the round — well before attackers can call out the angle or rotate. Of the ${peeks.length} angles below, ${countByRisk.low} are classed low-risk, ${countByRisk.medium} are calculated plays, and ${countByRisk.high} are high-commitment leans that get punished by attentive attackers. Pick the ones that match your aggression budget.`;
}

function renderOutro(map: Map): string {
  return `Spawn peeks on ${map.name} reward repetition and discipline. Pick one or two of the angles above, drill the exact step-out timing, and integrate them into your defender routine — but don't lean every round, or attackers will adapt and prefire. Community success rates shift as the meta moves and as Ubisoft patches the map's geometry; the database below updates whenever players submit new data.\n\nReady to study the angles visually? Open the full interactive ${map.name} map at /maps/${map.slug} to see exactly where each peek pin sits on the top-down floor plan, with a video clip for every documented angle.`;
}

function difficultyDescriptor(avg: number): string {
  if (avg <= 2.2) return "mostly beginner-friendly";
  if (avg <= 3.2) return "a mix of beginner-friendly and intermediate";
  if (avg <= 4) return "skewed toward intermediate-to-advanced";
  return "demanding, with a strong advanced-player bias";
}

function renderFaq(
  map: Map,
  peeks: BlogPeek[],
  avgDifficulty: number
): Array<{ q: string; a: string }> {
  const topMeasured = topMeasuredPeek(peeks);
  const topEstimate = topEstimatePeek(peeks);
  const floorBuckets = new Map<string, number>();
  for (const p of peeks) {
    floorBuckets.set(p.floor.name, (floorBuckets.get(p.floor.name) ?? 0) + 1);
  }
  const floorBreakdown = Array.from(floorBuckets.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${n} on ${name}`)
    .join(", ");

  return [
    {
      q: `What's the best spawn peek on ${map.name}?`,
      a: topMeasured
        ? `${topMeasured.name} on ${topPeekFloorName(topMeasured)} currently leads the community effectiveness rankings at grade ${peekGrade(topMeasured)} across ${votesText(topMeasured.vote_count)}. It's a ${RISK_LABELS[topMeasured.risk]} play with a difficulty of ${topMeasured.difficulty}/5 — read the full breakdown below for the exact step-out and timing.`
        : `${topEstimate.name} on ${topPeekFloorName(topEstimate)} is the standout pick by our effectiveness grade (graded ${peekGrade(topEstimate)}) — a ${RISK_LABELS[topEstimate.risk]} play with a difficulty of ${topEstimate.difficulty}/5. Community voting is just getting started; vote "Worked for me" or "Didn't work" on any peek to make these grades community-backed.`,
    },
    {
      q: `How many spawn peeks does ${map.name} have?`,
      a: `${peeks.length} viable, published spawn peek angles on ${map.name} are tracked in the peekabooR6 database${floorBreakdown ? `, with the breakdown being ${floorBreakdown}` : ""}. New angles are added as the community reports them.`,
    },
    {
      q: `Are spawn peeks on ${map.name} hard to learn?`,
      a: `The current set is ${difficultyDescriptor(avgDifficulty)} (average difficulty ${avgDifficulty.toFixed(1)}/5). Start with the highest-success-rate angles in the breakdown below — they're typically the easiest to execute and offer the most return per round.`,
    },
    {
      q: `How do I counter spawn peeks on ${map.name}?`,
      a: `Open the interactive ${map.name} map at /maps/${map.slug} and study the exact pin positions before attacking. Prefire the documented angles as you cross the spawn perimeter, vary your approach lanes between rounds so defenders can't pre-aim, and don't sprint blindly past known holds in the first ten seconds.`,
    },
  ];
}

export function peekLeadIn(peek: BlogPeek): string {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const variant = simpleHash(peek.slug) % 4;
  const floorName = peek.floor.name;
  const tipOrRisk = peek.tip
    ? `Tip from the community: ${peek.tip}`
    : `It's a ${RISK_LABELS[peek.risk]} play that rewards players who learn the exact step-out timing.`;

  // Estimate tier: grade from the admin seed, never a percentage.
  if (r.tier === "estimate") {
    switch (variant) {
      case 0:
        return `${peek.name} is a ${RISK_LABELS[peek.risk]} play graded ${r.grade} for effectiveness by our current estimate. It works best for defenders who can commit to the angle the moment they hear the round timer hit zero.`;
      case 1:
        return `If you're hunting round-one impact on ${floorName}, ${peek.name} grades ${r.grade} for effectiveness, with a difficulty of ${peek.difficulty}/5. Community voting will refine that over time.`;
      case 2:
        return `${peek.name} takes practice to execute cleanly; it grades ${r.grade} for effectiveness. Difficulty sits at ${peek.difficulty}/5 and the risk profile is ${RISK_LABELS[peek.risk]}.`;
      default:
        return `${peek.name} is a ${RISK_LABELS[peek.risk]} angle out of ${floorName}, graded ${r.grade} for effectiveness. ${tipOrRisk}`;
    }
  }

  // Measured tier: the community-backed grade always travels with its vote count.
  const frag = `a community grade of ${r.grade} from ${votesText(r.votes)}`;
  switch (variant) {
    case 0:
      return `${peek.name} is a ${RISK_LABELS[peek.risk]} play holding ${frag}. It works best for defenders who can commit to the angle the moment they hear the round timer hit zero.`;
    case 1:
      return `If you're hunting round-one impact on ${floorName}, ${peek.name} is one of the more reliable options — ${frag}, with a difficulty of ${peek.difficulty}/5.`;
    case 2:
      return `${peek.name} takes practice to execute cleanly, but ${frag} explains why advanced players keep coming back to it. Difficulty sits at ${peek.difficulty}/5 and the risk profile is ${RISK_LABELS[peek.risk]}.`;
    default:
      return `${peek.name} pulls ${frag} out of ${floorName}. ${tipOrRisk}`;
  }
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- excerpt for the index page ---
export function articleExcerpt(data: { intro: string }): string {
  const firstSentence = data.intro.split(/(?<=\.)\s+/)[0] ?? "";
  return firstSentence;
}
