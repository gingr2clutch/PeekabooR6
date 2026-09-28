import { Fragment, type CSSProperties } from "react";

// Placeholder tiles that fill the ragged end of a map grid.
//
// Both grids are 2 / 3 / 4 columns (base / sm / md+), so the number of empty
// spots in the last row is three different numbers at once. With 18 maps it is
// 0 / 0 / 2; add one map and it becomes 1 / 2 / 1. Nothing here is hardcoded to
// 18 — the counts fall out of maps.length, so the grid keeps itself square as
// the map list grows.
//
// Resolved on the server and expressed purely in CSS. We render as many tiles
// as the hungriest breakpoint needs and let each one show or hide itself per
// breakpoint, rather than measuring the viewport on the client. No JS, no
// resize listener, nothing that can paint one count and then correct it — a
// hidden tile is display:none and is not a grid item at all, so a tile that is
// not wanted at a given width occupies nothing and shifts nothing.

/** Column count at base / sm / md+, matching both grids' class lists. */
const COLUMN_COUNTS = [2, 3, 4] as const;

/** Empty spots in the last row for `n` items across `cols` columns. */
function emptiesFor(n: number, cols: number): number {
  if (n <= 0) return 0;
  return (cols - (n % cols)) % cols;
}

// Per-breakpoint visibility, as literal class strings.
//
// Literal on purpose: Tailwind scans source text, so a class assembled at
// runtime ("sm:" + verb) would never be generated. The key is base/sm/md, 1 for
// shown and 0 for hidden.
const VISIBILITY: Record<string, string> = {
  "000": "hidden sm:hidden md:hidden",
  "001": "hidden sm:hidden md:block",
  "010": "hidden sm:block md:hidden",
  "011": "hidden sm:block md:block",
  "100": "block sm:hidden md:hidden",
  "101": "block sm:hidden md:block",
  "110": "block sm:block md:hidden",
  "111": "block sm:block md:block",
};

export function FutureMapSlots({
  mapCount,
  orderStep,
  reveal = false,
}: {
  /** Real maps in the grid. Only these count — the tiles are not maps. */
  mapCount: number;
  /** Must match the grid's own card order step, so tiles sort after the last card. */
  orderStep: number;
  /**
   * Whether the grid's cards animate in. The homepage cards carry `.reveal`
   * with a `--i` stagger; the gadgets grid has no entrance animation. Tiles
   * follow whichever page they are on rather than inventing motion of their own.
   */
  reveal?: boolean;
}) {
  const empties = COLUMN_COUNTS.map((c) => emptiesFor(mapCount, c));
  // One tile per spot the greediest breakpoint needs; the rest hide themselves.
  const tileCount = Math.max(...empties);
  if (tileCount <= 0) return null;

  return (
    <>
      {Array.from({ length: tileCount }, (_, j) => {
        const key = empties.map((e) => (j < e ? "1" : "0")).join("");
        const style: CSSProperties = {
          // After every card: the last one sits at (mapCount - 1) * orderStep.
          // The in-grid ad orders itself into the teens, far below this, so it
          // keeps its row boundary untouched at every width.
          order: (mapCount + j) * orderStep,
        };
        if (reveal) {
          // Same 4-card stagger cycle the grid uses, continued past the last
          // card so a tile sweeps in with the row it belongs to.
          (style as Record<string, unknown>)["--i"] = 5 + ((mapCount + j) % 4);
        }

        return (
          <Fragment key={j}>
            <li
              // Not content: a reader gains nothing from "New map, coming
              // soon" repeated at the end of a grid, and there is nothing here
              // to navigate to.
              aria-hidden="true"
              className={`${VISIBILITY[key]}${reveal ? " reveal" : ""}`}
              style={style}
            >
              {/* Same box as a map card — aspect-square, same radius, same 2px
                  border — so it cannot change the grid's rhythm. Dashed and
                  barely tinted, with no elevation, so it reads as an empty
                  spot rather than a card that failed to load. */}
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-ink/[0.16] bg-ink/[0.045] text-base font-medium">
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-extrabold leading-none text-ink/[0.14] text-[56px] sm:text-[72px] md:text-[100px]"
                >
                  ?
                </span>
                {/* Name only — the card's second line is a peek count and a
                    tile has nothing to count. The deeper bottom padding is
                    what keeps "New map" on the map names' baseline rather than
                    dropping it onto the line where peek counts sit: a card's
                    name clears its bottom edge by 38px, and 36px plus this
                    box's 2px border is the same 38. */}
                <span className="relative z-10 mt-auto w-full px-3 pb-9 text-left">
                  <span className="block truncate text-ink/[0.42]">
                    New map
                  </span>
                </span>
              </div>
            </li>
          </Fragment>
        );
      })}
    </>
  );
}
