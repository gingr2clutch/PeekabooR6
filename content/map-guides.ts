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

  "calypso-casino": {
    seoTitle: "Calypso Casino Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 11 community-graded spawn peeks on Calypso Casino in Rainbow Six Siege — from the S-tier Registration door to second-floor window angles, with attacker counters.",
    heading: "Calypso Casino Spawn Peeks — What to Know",
    intro:
      "Calypso Casino is still new enough that most attackers haven't memorized its peek angles — which is exactly why they keep working. The community has graded 11 peeks here across three floors, and one of them has already earned an S grade. Learn these before your opponents do.",
    sections: [
      {
        heading: "Registration door — the S-tier",
        body:
          "The highest-graded peek on the map, and it isn't close: the first-floor Registration door has held an S grade across 70 community votes. It's a fast, early angle that most attackers still don't respect. If you learn one peek on this map, it's this one — and if you're attacking, treat Registration as hot from the first second.",
      },
      {
        heading: "Second-floor angles: Rope door and Heaven window",
        body:
          "The second floor carries most of the map's remaining threat. Rope door grades out at A with solid vote volume, and Heaven window sits at A as well — both punish attackers who drone lazily or cross open lanes early. Coat door and Kitchen wall are situational B-grade picks worth mixing in so you stay unpredictable.",
      },
      {
        heading: "The trap peeks",
        body:
          "Not everything here is worth the risk: Office double wall in the basement and the Mezza and Aquarium windows grade out at C despite plenty of votes. They can catch a rushing squad once, but the community data says they get punished more often than they connect. Check the grades above before you commit.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "On a newer map, spawn-peek discipline wins rounds by itself: pre-aim Registration door every round, drone before crossing anything that faces the casino's second-floor windows, and punish repeat peekers — the same defender rarely switches angles. See the attacker view for this map for exact pre-aim positions.",
      },
    ],
  },

  clubhouse: {
    seoTitle: "Clubhouse Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 13 community-graded spawn peeks on Clubhouse in Rainbow Six Siege — Server wall, Strip wall, CCTV window and more, with grades and attacker counters.",
    heading: "Clubhouse Spawn Peeks — What to Know",
    intro:
      "Clubhouse has been in Siege since launch, and after all these years attackers still die to the same opening angles. The community has graded 13 peeks here, led by a stack of A-grade wall and window angles that cover nearly every approach to the building.",
    sections: [
      {
        heading: "Server wall and Strip wall — the A-tier core",
        body:
          "Server wall on the second floor is the top-graded peek on the map at A+, with Strip wall close behind on the first floor. Both are opened-wall angles that catch attackers moving off spawn toward their default entry points. They're strongest in the first ten seconds — after that, smart attackers are already respecting them.",
      },
      {
        heading: "CCTV window and the second-floor windows",
        body:
          "CCTV window grades at A- and Main stair and Gym windows sit in the B range — classic quick-flick angles that punish predictable routes. These are lower commitment than the wall peeks: crack the window, take the flick, drop back before anyone trades you.",
      },
      {
        heading: "Basement surprise: Dirt wall",
        body:
          "Dirt wall holds an A- from the basement — an angle many attackers forget exists because it comes from below their natural eyeline. It's the most unexpected of Clubhouse's high-graded peeks, which is a big part of why it keeps working.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Clubhouse peeks are wall-heavy, which means they're loud — listen for the wall being opened during prep phase and pre-aim accordingly. Assign one player to watch Server and Strip angles while the rest of the squad crosses. See the attacker view for this map for exact pre-aim positions.",
      },
    ],
  },

  "nighthaven-labs": {
    seoTitle: "Nighthaven Labs Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 13 community-graded spawn peeks on Nighthaven Labs in Rainbow Six Siege — Warehouse wall, basement angles and more, with grades and attacker counters.",
    heading: "Nighthaven Labs Spawn Peeks — What to Know",
    intro:
      "Nighthaven Labs punishes attackers who treat the exterior like dead space. The community has graded 13 peeks across its three floors, and while none have cracked S-tier yet, the sheer number of B+ angles means defenders always have a fresh option attackers haven't pre-aimed.",
    sections: [
      {
        heading: "Warehouse wall — the top angle",
        body:
          "The first-floor Warehouse wall is the highest-graded peek on the map at A. Warehouse is a natural attacker entry point, and this angle catches them before they've even settled into the approach. The related Warehouse window and Top warehouse door on the second floor give the same zone two more layers of threat.",
      },
      {
        heading: "The B+ rotation: Animus, Vending, Games Hallway, Storage",
        body:
          "Four peeks sit at B+ — Animus single wall in the basement, plus Vending window, Games Hallway and Storage window on the first floor. None is dominant alone, but that's the strength: a defense that rotates between them is impossible to fully pre-aim. Vary your pick round to round.",
      },
      {
        heading: "What to skip",
        body:
          "Electrical wall on the second floor has been voted down to an F — the community verdict is that it gets you killed. When a peek grades that badly with real votes behind it, believe the data over the highlight clip that made you want to try it.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "The Warehouse zone is the danger area — drone it before committing and never walk the approach in a straight line. Because this map's threat is spread across many mid-grade angles rather than one killer peek, full pre-aim coverage isn't realistic; moving unpredictably matters more here than on older maps. See the attacker view for exact positions.",
      },
    ],
  },

  bank: {
    seoTitle: "Bank Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All community-graded spawn peeks on Bank in Rainbow Six Siege — Loan window, Electrical door, Garage entrance and more, with grades and attacker counters.",
    heading: "Bank Spawn Peeks — What to Know",
    intro:
      "Bank is one of Siege's oldest competitive maps, and its spawn peeks are correspondingly well known — which cuts both ways. The community has graded 8 peeks here, and the top angles still earn their A grades against anyone who forgets to respect them.",
    sections: [
      {
        heading: "Loan window and Electrical door",
        body:
          "The two first-floor A-grade angles. Loan window is the headline peek on the map — a fast window angle onto the attacker approach that has stayed effective for years. Electrical door at A- is its partner on the other flank; together they force attackers to respect both sides of the building from the opening second.",
      },
      {
        heading: "Garage entrance from the basement",
        body:
          "The basement Garage entrance grades at B- but deserves a mention because of where it comes from — attackers watching the upper windows routinely miss the low angle entirely. It's a situational pick, best used when the enemy team has shown they spawn toward garage side.",
      },
      {
        heading: "The second-floor options",
        body:
          "Top square door leads the upper floor at B+, with Left connecter and Stocks windows further down the list at C. On a map this heavily studied, the C-grade angles are mostly known traps — the data above tells you which windows attackers are already pre-aiming.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Bank peeks are famous, so this is a discipline check: pre-aim Loan and Electrical every single round, and don't cross open ground toward the building until both are cleared or smoked. If you're dying to Bank spawn peeks in 2026, the problem is the routine, not the knowledge. See the attacker view for exact pre-aim positions.",
      },
    ],
  },

  border: {
    seoTitle: "Border Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 13 community-graded spawn peeks on Border in Rainbow Six Siege — the S-tier Armory balcony, runouts, window angles and attacker counters.",
    heading: "Border Spawn Peeks — What to Know",
    intro:
      "Border might be the most spawn-peek-dangerous map in the rotation. The community has graded 13 peeks here, including an S-tier balcony angle and an aggressive runout — and the map's short sightlines off spawn mean attackers have very little time to react to any of them.",
    sections: [
      {
        heading: "Armory balcony — the S-tier",
        body:
          "The second-floor Armory balcony is Border's signature peek and holds an S grade. It gives defenders a commanding early angle that catches attackers almost immediately off spawn, and even teams that know it's coming struggle to punish it cleanly. If it isn't pre-aimed, it's a free pick.",
      },
      {
        heading: "Gen door runout",
        body:
          "Graded A, the Gen door runout is the aggressive option — a defender briefly leaves the building to take a fight attackers don't expect that early. Runouts live and die on surprise and timing: use it sparingly, because a team that's seen it once will be waiting the next round.",
      },
      {
        heading: "Tellers window and the first-floor angles",
        body:
          "Tellers window carries an A grade on the first floor, backed by Passport door, Main entrance and Prison wall in the B range. Border's lower floor produces quick, close-range peek fights — lower commitment than the balcony, and effective at chipping the attack before it organizes.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Armory balcony must be pre-aimed or smoked every round — treat it as non-negotiable. Hold an angle on Gen door for the first ten seconds to punish the runout, and only then start your approach. Border rewards patient openings more than almost any other map. See the attacker view for exact positions.",
      },
    ],
  },

  chalet: {
    seoTitle: "Chalet Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 13 community-graded spawn peeks on Chalet in Rainbow Six Siege — Lounge, Trophy and Fireplace angles, a pixel climb, and attacker counters.",
    heading: "Chalet Spawn Peeks — What to Know",
    intro:
      "Chalet's wide exteriors and big ground-floor windows make it a spawn-peeker's playground — the community has graded 13 peeks here and a remarkable eight of them sit at A grade. There is no safe approach to this building without clearing angles first.",
    sections: [
      {
        heading: "The first-floor window wall: Lounge, Trophy, Fireplace",
        body:
          "Chalet's ground floor is the threat. Lounge window (41 votes), Trophy window (39) and the Fireplace window and door all grade at A — a row of fast angles covering the main approaches. The vote counts matter here: these aren't niche picks, they're proven angles the community keeps confirming round after round.",
      },
      {
        heading: "Upstairs: Balcony window and the second-floor set",
        body:
          "Balcony window leads the second floor at A grade, with Library, Bathroom and Astro windows in the B range behind it. The upper angles are slower to reach but harder to punish — a natural second option once attackers start pre-aiming the ground floor.",
      },
      {
        heading: "The pixel climb",
        body:
          "The 'Pixel beach chair ladder climb up' grades at A on only 7 votes — a niche, off-meta angle that works precisely because almost nobody expects a defender there. Angles like this get patched or popularized eventually; enjoy it while it's still a secret.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Against Chalet you cannot clear every window — there are too many. Instead, pick your approach lane, smoke or pre-aim the two or three angles that actually see it, and deny the rest by simply not being visible to them. Crossing open snow without a plan is how rounds end in five seconds. See the attacker view for exact positions.",
      },
    ],
  },

  coastline: {
    seoTitle: "Coastline Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 10 community-graded spawn peeks on Coastline in Rainbow Six Siege — Hookah angles, Pool entrance, VIP balcony and attacker counters.",
    heading: "Coastline Spawn Peeks — What to Know",
    intro:
      "Coastline is an aggressive defender's map, and its peek list reflects that: 10 community-graded angles spread evenly across both floors, headlined by the Hookah pair. Nothing here is S-tier, but the volume of solid B+ options means the threat never comes from the same window twice.",
    sections: [
      {
        heading: "The Hookah pair",
        body:
          "Hookah window (A-) and Hookah door (B+) are Coastline's best-graded peeks, both on the second floor. Hookah's position gives it early vision over a key approach, and having both a window and a door angle from the same zone lets defenders vary the look round to round without changing position.",
      },
      {
        heading: "First-floor doors: Pool entrance, Office, Main",
        body:
          "The ground floor is door-heavy — Pool entrance and Office door grade B+, with Main door and Service door at B. Door peeks on Coastline are quick in-and-out checks rather than held angles; their job is to steal one early kill or force attackers to slow down and drone.",
      },
      {
        heading: "VIP balcony and the wildcard angles",
        body:
          "VIP balcony (B-) is the aggressive option, and Top white window and Sunrise bar round out the mid-tier. None of these dominates alone — Coastline peeking is about unpredictability, not one killer angle. The grades above tell you which options are earning their risk.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Pre-aim Hookah on every approach that it sees — it's the one consistent threat. For the rest, deny the quick door peeks by holding angles at range rather than walking into their effective distance. Coastline defenders want a fast, chaotic opening; a patient attack takes that away. See the attacker view for exact positions.",
      },
    ],
  },

  consulate: {
    seoTitle: "Consulate Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 13 community-graded spawn peeks on Consulate in Rainbow Six Siege — two S-tier angles, Piano hallway, Garage wall and attacker counters.",
    heading: "Consulate Spawn Peeks — What to Know",
    intro:
      "Consulate is one of only a few maps with two S-tier spawn peeks, and they come from opposite ends of the building — one ground-floor window, one basement wall. The community has graded 13 angles here, and the top of the list is as dangerous as anything in Siege.",
    sections: [
      {
        heading: "Closet window — S-tier",
        body:
          "The first-floor Closet window holds an S grade. It's a fast, tight angle that catches attackers early on their approach, and the small window profile makes the defender brutally hard to trade. This is the peek that defines Consulate's opening seconds.",
      },
      {
        heading: "Garage wall — the other S-tier",
        body:
          "An S-grade angle from the basement: the Garage wall peek catches attackers who treat the garage side as a safe default entry. Low angles are chronically under-respected, and the grade here proves it — attackers simply don't clear it, round after round.",
      },
      {
        heading: "Piano hallway and the second-floor windows",
        body:
          "Piano hallway window backs up the S-tiers with an A grade on the first floor, while the second floor offers a wide spread of B-grade options — Admin office, Copy room, Balcony wall, Bathroom window. Deep options for varying the threat once the famous angles start getting pre-aimed.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Two S-tiers means two mandatory pre-aims: assign one player to Closet window and treat the garage approach as contested until the wall angle is cleared or smoked. Consulate punishes autopilot approaches harder than almost any map — the data above is the checklist. See the attacker view for exact positions.",
      },
    ],
  },

  "emerald-plains": {
    seoTitle: "Emerald Plains Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 8 community-graded spawn peeks on Emerald Plains in Rainbow Six Siege — the S+ Folding screen window, A+ door angles and attacker counters.",
    heading: "Emerald Plains Spawn Peeks — What to Know",
    intro:
      "Emerald Plains doesn't get the ranked play time of the classics, and its spawn peeks are nastier for it — fewer attackers have the angles memorized. The community has graded 8 peeks here, topped by the only S+ on this entire site's current board.",
    sections: [
      {
        heading: "Folding screen window — the S+",
        body:
          "The second-floor Folding screen window is the highest-graded spawn peek on Emerald Plains — S+, the top grade a peek can earn. It combines an early sightline with a profile attackers rarely check. Until your opponents prove they're pre-aiming it, this angle is close to a free opening pick.",
      },
      {
        heading: "The A+ doors: Music and Lobby",
        body:
          "Music door upstairs and Lobby door on the ground floor both grade A+ — quick door angles covering separate approaches. With Mud room door and Trophy window at A behind them, Emerald Plains has top-heavy quality: five of its eight graded peeks are A or better.",
      },
      {
        heading: "The supporting cast",
        body:
          "Back entrance door (B+), Archive door and Bar wall (B) fill out the list. On a map where the headline angles are this strong, the B-tier picks are your changeup — use them after the enemy team starts respecting the famous ones.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Most attackers don't know Emerald Plains peek angles, and defenders here are betting on exactly that. Break the bet: drone the Folding screen side before crossing, pre-aim the door angles on your approach lane, and this map's biggest defensive edge evaporates. See the attacker view for exact positions.",
      },
    ],
  },

  "kafe-dostoyevsky": {
    seoTitle: "Kafe Dostoyevsky Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 12 community-graded spawn peeks on Kafe Dostoyevsky in Rainbow Six Siege — Mining window, Piano angles, Bakery door and attacker counters.",
    heading: "Kafe Dostoyevsky Spawn Peeks — What to Know",
    intro:
      "Three floors of windows overlooking every approach — Kafe was built for spawn peeking. The community has graded 12 angles here, spread across all three levels, with the third-floor Piano windows forming a threat zone all of their own.",
    sections: [
      {
        heading: "Mining window — the top angle",
        body:
          "Second-floor Mining window leads the board at A grade. It's a classic Kafe peek: early vision onto the attacker approach, quick to take, quick to abandon. Hall door on the same floor backs it up at A-, giving the second level two proven openers.",
      },
      {
        heading: "The Piano floor",
        body:
          "The third floor is Kafe's watchtower — Bathroom hallway window grades A-, with three separate Piano-area windows in the B range. Height makes these angles hard to trade and gives defenders a fallback: even when one Piano window is pre-aimed, the next one over sees nearly the same lane.",
      },
      {
        heading: "Ground floor: Bakery and Garage doors",
        body:
          "Bakery door (B+) and the bottom white Garage door (A-) cover the street level. These are the close-range options — faster fights, bigger risk, and the angles attackers physically walk into when they rush their entry. Reception and Dining fill out the list at B.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Kafe's threat is vertical — clearing one floor of windows means nothing when the floor above sees the same ground. Approach along lanes that stack the floors behind cover, smoke when you can't, and remember the third floor exists on every cross. See the attacker view for exact pre-aim positions.",
      },
    ],
  },

  kanal: {
    seoTitle: "Kanal Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All community-graded spawn peeks on Kanal in Rainbow Six Siege — the S+ Bottom red door, bridge-side angles and attacker counters.",
    heading: "Kanal Spawn Peeks — What to Know",
    intro:
      "Kanal's split-building layout creates unusual peek geometry — angles come from levels and directions attackers don't expect. The community has graded 7 peeks here, and the top one carries an S+ from the least expected place on the map: the basement.",
    sections: [
      {
        heading: "Bottom red door — the S+",
        body:
          "Kanal's best peek is its lowest: the basement's Bottom red door grades S+. Attackers scanning the upper windows on their approach walk straight into a low, tight angle they never cleared. It's the definition of an under-respected peek — and the grade says it keeps winning.",
      },
      {
        heading: "The second-floor pair: Top white stairs and Roof entrance",
        body:
          "Both grade B+ — solid, repeatable angles from the upper level covering the main approaches. They're the conventional threat on Kanal: attackers expect high peeks and still get caught by them, because covering high and low simultaneously splits attention.",
      },
      {
        heading: "The mid-tier windows",
        body:
          "Kitchen window and Green hall window sit at B, with Projector and Red hall at C. Kanal's list is shorter than most maps', which concentrates the danger: there are only a few angles to learn, and the good ones are very good.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Clear low first on Kanal — the S+ threat is at ground level, not up high. Once Bottom red door is respected, the remaining angles are conventional window peeks you can pre-aim on approach. A short peek list means a short checklist; there's no excuse for skipping it. See the attacker view for exact positions.",
      },
    ],
  },

  outback: {
    seoTitle: "Outback Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 9 community-graded spawn peeks on Outback in Rainbow Six Siege — Lounge west window, Garage door, Loading door and attacker counters.",
    heading: "Outback Spawn Peeks — What to Know",
    intro:
      "Outback's compact exterior means short approaches — and short approaches mean spawn peeks connect fast. The community has graded 9 angles here, with three A- peeks covering different sides of the building so no spawn is truly safe.",
    sections: [
      {
        heading: "The A- trio: Lounge west, Garage door, Reception",
        body:
          "Lounge west window upstairs (19 votes) plus Garage and Reception doors on the ground floor all grade A-. Between them they threaten every practical approach — the strength of Outback's peek game isn't one dominant angle, it's that all three sides of the building bite.",
      },
      {
        heading: "Loading door — the volume pick",
        body:
          "Loading door has the most votes on the map (24) and grades B+. High vote counts mean high usage: this is the peek Outback defenders actually take most often, and the grade holding at B+ despite that popularity means it still works even when attackers should see it coming.",
      },
      {
        heading: "What the data warns against",
        body:
          "Yellow door (C-) and Terrace door (D) sit at the bottom of the board. Terrace especially is the kind of aggressive angle that looks great in a clip and dies to a pre-aim in practice. The community has voted; believe them.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "With threats on three sides, the counter is lane discipline: pick your entry side, clear only its angles — window first, then doors — and don't wander the exterior. Outback punishes teams that split around the building before clearing anything. See the attacker view for exact pre-aim positions.",
      },
    ],
  },

  skyscraper: {
    seoTitle: "Skyscraper Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All 10 community-graded spawn peeks on Skyscraper in Rainbow Six Siege — Top black door, Closet window, VIP wall and attacker counters.",
    heading: "Skyscraper Spawn Peeks — What to Know",
    intro:
      "Skyscraper's tight exterior walkways leave attackers exposed from the moment they spawn, and its rework left plenty of peek angles intact. The community has graded 10 peeks here, led by three A-grade angles split across both floors.",
    sections: [
      {
        heading: "The A-tier: Top black door, Closet window, VIP wall",
        body:
          "Top black door and the VIP single wall threaten from the second floor while Closet window covers the ground — three A-grade angles that between them see most of the map's approach routes. VIP's wall angle is the sneakiest of the three; a single opened panel is easy to miss on a drone pass.",
      },
      {
        heading: "The runout: Coat window",
        body:
          "The Coat window runout grades B — Skyscraper's aggressive option, taking the fight outside the building entirely. Like all runouts it's strongest the first time and a liability once shown. Save it for rounds where the enemy has gotten comfortable.",
      },
      {
        heading: "The window set",
        body:
          "Toilet, Shrine, Lobby and Kitchen windows fill the B-to-C range — quick checks along the exterior walkways. On a map where attackers must walk narrow outdoor paths, even mid-grade window peeks force slow, careful movement, which is a win in itself.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Skyscraper's walkways are kill funnels — never move along them while the windows overlooking your path are uncleared. Pre-aim the A-tier three on your chosen approach, watch for the Coat runout early, and use the walkway railings as partial cover on every cross. See the attacker view for exact positions.",
      },
    ],
  },

  "theme-park": {
    seoTitle: "Theme Park Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "All community-graded spawn peeks on Theme Park in Rainbow Six Siege — Gong door, Maintenance window, Lockers door and attacker counters.",
    heading: "Theme Park Spawn Peeks — What to Know",
    intro:
      "Theme Park's peek list is short but sharp — 6 community-graded angles and not a single one below B+. Defenders here don't have many options, but every option they have is worth taking, which makes the map deceptively dangerous for attackers who relax off spawn.",
    sections: [
      {
        heading: "The ground-floor A-tier: Gong, Maintenance, Lockers",
        body:
          "Three A-grade angles, all on the first floor: Gong door, Maintenance window and Lockers door. Each covers a different slice of the approach, and all three are quick-commitment peeks — a flick, a pick or nothing, then gone before the trade arrives.",
      },
      {
        heading: "The B+ support: Arcade, Cafe, Bathroom",
        body:
          "Arcade window and Bathroom window on the ground floor plus Cafe door upstairs round out the list at B+. Cafe is the only elevated angle of the six, which makes it the changeup — attackers clearing the ground-floor doors rarely check it in time.",
      },
      {
        heading: "Why the short list matters",
        body:
          "Six peeks, all B+ or better, is a different kind of threat than a twenty-angle map: everything here is proven. There's no filler to waste your prep phase on as a defender — and no low-value angles for attackers to safely ignore.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Every one of these six angles deserves respect, but they're concentrated on the ground floor — clear doors and windows at street level on your approach lane and you've handled five of the six. Just don't forget Cafe exists above you. See the attacker view for exact pre-aim positions.",
      },
    ],
  },

  villa: {
    seoTitle: "Villa Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "Community-graded spawn peeks on Villa in Rainbow Six Siege — Study window, Garage runout, Studio window and attacker counters. Early data, updated as votes come in.",
    heading: "Villa Spawn Peeks — What to Know",
    intro:
      "Villa's peek list is still young — 5 graded angles so far, with votes actively coming in. But the early picture is already clear: the angles that are working span all three levels of the house, from a second-floor window to a basement runout, so attackers can't clear one layer and call it safe.",
    sections: [
      {
        heading: "Study window — the early leader",
        body:
          "The second-floor Study window is Villa's top-voted peek so far and holds an A grade. Height plus an early sightline over the approach makes it the angle to learn first — and the one attackers should assume is occupied until proven otherwise.",
      },
      {
        heading: "Garage runout",
        body:
          "The basement Garage runout has drawn the second-most votes on the map at A-. Like every runout it's a surprise weapon: devastating against a team that hasn't seen it, a liability against one that has. First rounds are its best rounds.",
      },
      {
        heading: "The rest of the early board",
        body:
          "Studio window and Main entrance door hold A grades on thin votes, with Closet window at B-. Grades this early can move fast — check back as the vote counts grow, and if you've played these angles, vote on them and sharpen the data.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Respect the vertical spread: clear Study's angle before crossing anything it sees, and give the garage side a beat before walking past it — that's where the runout lives. Villa's data is young, so expect defenders to still be experimenting. See the attacker view for exact positions.",
      },
    ],
  },

  fortress: {
    seoTitle: "Fortress Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "Community-graded spawn peeks on Fortress in Rainbow Six Siege — Shower door, Cliffside and Main entrance angles with attacker counters. Early data, updated as votes come in.",
    heading: "Fortress Spawn Peeks — What to Know",
    intro:
      "Fortress has the shortest peek list on the site right now — 4 graded angles, all early-vote. That's partly the map: its thick walls and enclosed courtyards leave fewer natural spawn sightlines than most of the rotation. What it does have is door angles, and door angles reward defenders who pick their moment.",
    sections: [
      {
        heading: "Shower door — the one A",
        body:
          "The first-floor Shower door is the only A-grade peek on Fortress so far. It's a quick door check on a natural approach — low commitment, fast to abandon, and evidently connecting often enough to earn the top grade on the early votes.",
      },
      {
        heading: "The B-tier doors",
        body:
          "Cliffside entrance, Main entrance and the second-floor Fountain door all sit at B. On a map with this few options, even B-grade peeks earn their place in the rotation — three doors on three different approaches means attackers can't ignore any of them outright.",
      },
      {
        heading: "Why so few peeks?",
        body:
          "Fortress simply offers less spawn-peek geometry than open maps like Chalet or Border — and that's information in itself. If you're attacking Fortress, the opening seconds are safer than average. If you're defending, the few angles you do have are more predictable, so timing and variation matter more than position.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "Four known angles is a complete checklist: pre-aim the door on your approach lane and move. The bigger Fortress risk is complacency later in the round, not the spawn peek — but check those doors anyway. See the attacker view for exact positions.",
      },
    ],
  },

  lair: {
    seoTitle: "Lair Spawn Peeks — Rainbow Six Siege",
    seoDescription:
      "Community-graded spawn peeks on Lair in Rainbow Six Siege — Range booth, Garage door, Storage hallway and more with attacker counters. Early data, updated as votes come in.",
    heading: "Lair Spawn Peeks — What to Know",
    intro:
      "Lair is one of Siege's newer competitive maps and its peek data is still filling in — 7 graded angles so far across all three levels. The early standout pattern: five of the seven hold A grades, suggesting attackers haven't yet built the pre-aim habits here that they have on the classics.",
    sections: [
      {
        heading: "Range booth — the volume leader",
        body:
          "The first-floor Range booth has the most votes on the map and an A grade. It's the angle the community is actually using round to round, and so far it keeps paying. Learn it first from either side of the fight.",
      },
      {
        heading: "The A-grade spread",
        body:
          "Garage door in the basement, Storage hallway door and Operational window on the second floor, and Bottom main stairs door on the first — all A-grade on early votes. Threats from every level of the building, which is exactly what makes a new map miserable to attack blind.",
      },
      {
        heading: "The early skips",
        body:
          "Operation door has slipped to C on a handful of votes, and Display room window is unproven at B with no votes yet. On a young map, treat low grades as provisional — and if you take these angles yourself, vote the results so the board gets sharper.",
      },
      {
        heading: "Countering these as an attacker",
        body:
          "New map, high A-count — the defenders currently have the knowledge edge, so take it back the boring way: drone your approach lane fully, clear low before crossing the garage side, and expect a peek from a level you didn't drone. See the attacker view for exact positions.",
      },
    ],
  },
};
