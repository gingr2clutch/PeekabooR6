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

export function findGadget(slug: string): Gadget | undefined {
  return GADGETS.find((g) => g.slug === slug);
}
