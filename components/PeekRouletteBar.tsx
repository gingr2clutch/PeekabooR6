"use client";

import { useCallback, useEffect, useState } from "react";
import { PeekRoulette } from "@/components/PeekRoulette";
import { PeekRouletteWinModal } from "@/components/PeekRouletteWinModal";
import { track } from "@/lib/analytics";
import type { RoulettePeek } from "@/lib/peek-roulette-wheel";

type Props = {
  mapName: string;
  mapSlug: string;
  peeks: RoulettePeek[];
  // Last-resort popup thumbnail when a peek has neither clip nor poster.
  mapCoverUrl: string | null;
};

// Map-page placement: the felt bar in the hero plus the win popup it opens.
// The map is already known, so there is no map picker — tapping the wheel or
// the button spins immediately.
//
// State lives here rather than in PeekRoulette so the bar itself never changes
// height when a result arrives: the result is rendered in an overlay, not
// inside the bar. That is what keeps CLS at zero.
export function PeekRouletteBar({ mapName, mapSlug, peeks, mapCoverUrl }: Props) {
  const [landed, setLanded] = useState<RoulettePeek | null>(null);
  const [spinToken, setSpinToken] = useState(0);

  // Counts as "opened" once per mount, matching the homepage placement where
  // opening is an explicit tap.
  useEffect(() => {
    if (peeks.length > 0) track("roulette_opened", { placement: "map_page" });
  }, [peeks.length]);

  const handleSpinAgain = useCallback(() => {
    setLanded(null);
    // Bump a token the wheel watches, so "Spin again" respins in place instead
    // of returning the visitor to anything.
    setSpinToken((n) => n + 1);
  }, []);

  if (peeks.length === 0) return null;

  return (
    <>
      <PeekRoulette
        key={spinToken === 0 ? "initial" : `respin-${spinToken}`}
        mapName={mapName}
        mapSlug={mapSlug}
        peeks={peeks}
        variant="compact"
        placement="map_page"
        onLand={setLanded}
        autoSpin={spinToken > 0}
      />
      {landed && (
        <PeekRouletteWinModal
          peek={landed}
          mapName={mapName}
          mapSlug={mapSlug}
          placement="map_page"
          mapCoverUrl={mapCoverUrl}
          onSpinAgain={handleSpinAgain}
          onClose={() => setLanded(null)}
        />
      )}
    </>
  );
}
