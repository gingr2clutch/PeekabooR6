// PLACEHOLDER gadget data — no database yet.
//
// Shaped to match the columns a `gadgets` table will most likely have, so
// switching to Supabase later is a data-source swap inside loadGadgets() rather
// than a rewrite of the pages that consume it. Keep the field names stable.

export type GadgetSide = "attack" | "defense";

export type Gadget = {
  id: string;
  slug: string;
  name: string;
  operator: string;
  side: GadgetSide;
  category: string;
  summary: string;
  counters: string[];
  tips: string[];
};

export const GADGETS: Gadget[] = [
  {
    id: "g-thermite",
    slug: "exothermic-charge",
    name: "Exothermic Charge",
    operator: "Thermite",
    side: "attack",
    category: "Breach",
    summary:
      "Burns a full opening through a reinforced wall or hatch, creating the main entry line for the attacking side.",
    counters: ["Bandit battery", "Kaid electroclaw", "Mute jammer"],
    tips: [
      "Clear jammers and batteries before placing — the charge cancels if it is electrified.",
      "Place it after utility is spent, not before, or the defenders simply re-deny it.",
    ],
  },
  {
    id: "g-thatcher",
    slug: "emp-grenade",
    name: "EMP Grenade",
    operator: "Thatcher",
    side: "attack",
    category: "Utility denial",
    summary:
      "Disables every electronic device in a wide radius for a short window, including through walls and floors.",
    counters: ["Placement out of radius", "Re-deploying after the pulse"],
    tips: [
      "Throw it through a soft wall rather than around a corner — the pulse travels.",
      "Call the throw so the breacher is ready; the window is short.",
    ],
  },
  {
    id: "g-ash",
    slug: "breaching-rounds",
    name: "Breaching Rounds",
    operator: "Ash",
    side: "attack",
    category: "Breach",
    summary:
      "Fired from range to blow open soft walls and barricades without exposing yourself at the surface.",
    counters: ["Reinforced walls", "Impact-proof hatches"],
    tips: ["Open a line from cover, then let a teammate hold the angle you made."],
  },
  {
    id: "g-sledge",
    slug: "tactical-breaching-hammer",
    name: "Tactical Breaching Hammer",
    operator: "Sledge",
    side: "attack",
    category: "Breach",
    summary:
      "Silent, unlimited soft-wall and hatch destruction for creating unexpected lines.",
    counters: ["Reinforcements", "Sound cues giving your position away"],
    tips: ["Make the hole one swing at a time — a full opening announces you."],
  },
  {
    id: "g-mute",
    slug: "signal-disruptor",
    name: "Signal Disruptor",
    operator: "Mute",
    side: "defense",
    category: "Utility denial",
    summary:
      "Jams drones and blocks remote detonation of breaching charges inside its bubble.",
    counters: ["Thatcher EMP", "Twitch drone", "Shooting the jammer"],
    tips: [
      "Cover the reinforced wall and the hatch above it with one placement where the geometry allows.",
      "Hide it behind cover — an exposed jammer is a free kill for a drone operator.",
    ],
  },
  {
    id: "g-bandit",
    slug: "shock-wire",
    name: "Shock Wire",
    operator: "Bandit",
    side: "defense",
    category: "Utility denial",
    summary:
      "Electrifies reinforced walls and barbed wire, destroying breaching charges on contact.",
    counters: ["Thatcher EMP", "Impact grenades", "Twitch drone"],
    tips: ["Bandit-trick late: apply the battery as the charge lands, not before."],
  },
  {
    id: "g-kapkan",
    slug: "entry-denial-device",
    name: "Entry Denial Device",
    operator: "Kapkan",
    side: "defense",
    category: "Trap",
    summary:
      "A tripwire charge on a doorway or window frame that damages anyone crossing it.",
    counters: ["Drone scouting", "Shooting the laser", "Vaulting high"],
    tips: ["Place high or low on the frame — head height is the first place people check."],
  },
  {
    id: "g-valkyrie",
    slug: "black-eye",
    name: "Black Eye",
    operator: "Valkyrie",
    side: "defense",
    category: "Intel",
    summary:
      "Sticky cameras placed anywhere on the map, including outside, for permanent angle coverage.",
    counters: ["IQ", "Shooting the camera", "Twitch drone"],
    tips: [
      "One outside camera on the most-used spawn approach is worth more than three inside.",
      "Place them where a wall protects the lens from casual fire.",
    ],
  },
];

// Single read point. When the Supabase table exists, this becomes the query and
// nothing downstream changes.
export function loadGadgets(): Gadget[] {
  return [...GADGETS].sort((a, b) => a.name.localeCompare(b.name));
}

// PLACEHOLDER map association.
//
// Operator gadgets are not really map-specific, so there is no honest dummy
// mapping to invent here. This picks a deterministic subset from the map slug
// purely so the map -> gadgets flow is visibly working: the same map always
// shows the same gadgets, and different maps show different ones.
//
// The real version is a join (gadget_id, map_slug) or a per-map relevance
// score. When that table exists, replace this function body — every caller
// already treats it as "give me the gadgets for this map".
export function gadgetsForMap(mapSlug: string): Gadget[] {
  const all = loadGadgets();
  // Cheap stable hash of the slug — no randomness, so SSR and client agree.
  let h = 0;
  for (let i = 0; i < mapSlug.length; i++) h = (h * 31 + mapSlug.charCodeAt(i)) >>> 0;
  // Always return at least four, so no map page looks broken.
  return all.filter((_, i) => (h >> i % 8) % 3 !== 0 || i < 4);
}

/* ===========================================================================
   PLACEHOLDER navigation data for the map -> site -> operator -> placement
   flow. All dummy: no bomb-site or placement table exists yet.

   Real bomb sites vary per map (Oregon's are not Chalet's), so a fixed list
   here is a stand-in, not a claim about any map. Same for placements — the
   pin coordinates are invented, not surveyed. Keep the shapes; replace the
   bodies when the tables land.
   =========================================================================== */

export type BombSite = { slug: string; name: string; floorHint: string };

export type GadgetOperator = {
  slug: string;
  name: string;
  role: string;
  gadget: string;
};

export type Placement = {
  id: string;
  /* Percentages of the bird's-eye box, matching how peek pins are stored. */
  x: number;
  y: number;
  label: string;
  note: string;
};

// Four per map. Generic names because inventing map-specific ones would read
// as real data.
export const BOMB_SITES: BombSite[] = [
  { slug: "site-a", name: "Site A", floorHint: "Basement" },
  { slug: "site-b", name: "Site B", floorHint: "1st floor" },
  { slug: "site-c", name: "Site C", floorHint: "2nd floor" },
  { slug: "site-d", name: "Site D", floorHint: "2nd floor" },
];

export const GADGET_OPERATORS: GadgetOperator[] = [
  { slug: "denari", name: "Denari", role: "Support", gadget: "Placeholder gadget" },
  { slug: "valkyrie", name: "Valkyrie", role: "Intel", gadget: "Black Eye" },
  { slug: "kapkan", name: "Kapkan", role: "Trapper", gadget: "Entry Denial Device" },
];

export function sitesForMap(_mapSlug: string): BombSite[] {
  return BOMB_SITES;
}

export function findSite(slug: string): BombSite | undefined {
  return BOMB_SITES.find((s) => s.slug === slug);
}

export function findOperator(slug: string): GadgetOperator | undefined {
  return GADGET_OPERATORS.find((o) => o.slug === slug);
}

// Deterministic from operator + site so the same page always shows the same
// pins, and different operators/sites differ. Invented coordinates.
export function placementsFor(
  operatorSlug: string,
  siteSlug: string
): Placement[] {
  const key = `${operatorSlug}:${siteSlug}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const count = 3 + (h % 2); // 3 or 4 pins
  return Array.from({ length: count }, (_, i) => {
    const a = (h >> (i * 3)) % 100;
    const b = (h >> (i * 5 + 1)) % 100;
    return {
      id: `${key}-${i}`,
      x: 12 + (a % 76),
      y: 14 + (b % 68),
      label: `Placement ${i + 1}`,
      note: "Placeholder position — not a real callout.",
    };
  });
}
