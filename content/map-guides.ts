// Per-map SEO/guide content. A map page renders its guide section ONLY if an
// entry exists here — maps without one are completely unchanged.
export type MapGuide = {
  seoTitle: string;
  seoDescription: string;
  heading: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export const MAP_GUIDES: Record<string, MapGuide> = {
  oregon: {
    seoTitle: "Oregon Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "Every spawn peek on Oregon in Rainbow Six Siege — where to stand, what each angle sees, and how attackers counter them. Community-graded and updated.",
    heading: "Oregon Spawn Peeks — What to Know",
    intro:
      "Oregon is one of the most spawn-peek-heavy maps in Siege. Defenders get early sightlines onto all three attacker spawns within the first few seconds of the round, and most of them are repeatable enough that attackers should pre-aim them every single time. Here are the angles that matter, graded by the community above.",
    sections: [
      {
        heading: "Big Tower onto Construction Site",
        body:
          "The classic. From the top of Tower, defenders get a long sightline onto the Construction Site spawn almost immediately. It's a high-risk, high-reward peek — you're exposed to anyone pre-aiming the tower windows, but an early pick here wins the round more often than not. Attackers: spawn behind the truck and check Tower before moving.",
      },
      {
        heading: "Dorms windows onto Street",
        body:
          "The third-floor Dorms windows overlook the Street spawn. Quick flick peek, hard to punish because the window is small and the defender can drop back inside instantly. Attackers on Street should hug the left wall and never cross open ground without someone watching Dorms.",
      },
      {
        heading: "Meeting Hall onto Junkyard",
        body:
          "Meeting Hall windows give an angle onto the Junkyard spawn. Slower to set up than the Tower peek but safer for the defender. Watch the community grade on this one — its success rate shifts with the meta.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Every peek above has a counter: spawn behind hard cover, assign one player to pre-aim the known angle, and punish the second peek, not the first. See the attacker view for this map for exact pre-aim positions.",
      },
    ],
  },
};
