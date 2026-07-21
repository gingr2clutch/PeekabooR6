"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rating } from "@/lib/rate";
import {
  filterByMinGrade,
  MIN_GRADE_OPTIONS,
  MIN_GRADE_STORAGE_KEY,
  pickRandomPeek,
  type MinGradeValue,
  type RoulettePeek,
} from "@/lib/roulette";

type Tally = { attempted: number; hit: number };

// Today's local date as a stable key (YYYY-M-D, local time). Used both for the
// logged-out localStorage tally and to reset it at midnight.
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Per-map roulette session: auth state, today's tally, and the check-in writer.
// Mirrors FavoritesProvider — cookie-backed browser client, RLS keeps reads to
// the user's own rows, a missing table (pre-migration) is treated as empty.
// Logged-out attempts are tracked locally so the loop still works for guests.
function useRouletteSession(mapSlug: string, peekIds: string[]) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tally, setTally] = useState<Tally>({ attempted: 0, hit: 0 });

  const supabaseRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const userIdRef = useRef<string | null>(null);
  const peekIdSet = useMemo(() => new Set(peekIds), [peekIds]);
  const localKey = `peek-roulette-tally:${mapSlug}`;

  const readLocalTally = useCallback((): Tally => {
    try {
      const raw = window.localStorage.getItem(localKey);
      if (raw) {
        const o = JSON.parse(raw) as {
          date?: string;
          attempted?: number;
          hit?: number;
        };
        if (o.date === todayStr()) {
          return { attempted: o.attempted ?? 0, hit: o.hit ?? 0 };
        }
      }
    } catch {
      // localStorage unavailable / malformed — start fresh.
    }
    return { attempted: 0, hit: 0 };
  }, [localKey]);

  const writeLocalTally = useCallback(
    (t: Tally) => {
      try {
        window.localStorage.setItem(
          localKey,
          JSON.stringify({ date: todayStr(), ...t })
        );
      } catch {
        // ignore write failures
      }
    },
    [localKey]
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabaseRef.current = supabase;
    let active = true;

    async function loadDbTally() {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("roulette_attempts")
        .select("peek_id, hit, created_at")
        .gte("created_at", start.toISOString());
      if (!active) return;
      // error === table missing (pre-migration) or transient — keep empty.
      if (!error && data) {
        let attempted = 0;
        let hit = 0;
        for (const r of data as { peek_id: string; hit: boolean }[]) {
          if (peekIdSet.has(r.peek_id)) {
            attempted += 1;
            if (r.hit) hit += 1;
          }
        }
        setTally({ attempted, hit });
      }
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      userIdRef.current = user?.id ?? null;
      const li = !!user;
      setLoggedIn(li);
      if (li) await loadDbTally();
      else setTally(readLocalTally());
      if (active) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const present = !!session?.user;
      userIdRef.current = session?.user?.id ?? null;
      setLoggedIn(present);
      if (present) loadDbTally();
      else setTally(readLocalTally());
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // Runs once per map page mount; refs carry the live client/user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logAttempt = useCallback(
    (peekId: string, hitVal: boolean) => {
      // Optimistic bump. Logged-out tally is persisted locally so guests keep a
      // working "today" count without a round-trip.
      setTally((t) => {
        const next = {
          attempted: t.attempted + 1,
          hit: t.hit + (hitVal ? 1 : 0),
        };
        if (!userIdRef.current) writeLocalTally(next);
        return next;
      });

      const supabase = supabaseRef.current;
      const userId = userIdRef.current;
      if (!supabase || !userId) return; // logged-out → local only, already saved

      (async () => {
        // Set user_id explicitly so the RLS `with check (auth.uid() = user_id)`
        // insert policy always passes. Plain insert — attempts are immutable and
        // repeatable, so no upsert / unique handling needed.
        const { error } = await supabase
          .from("roulette_attempts")
          .insert({ peek_id: peekId, hit: hitVal, user_id: userId });
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[roulette] save failed:", error.message, error.code);
          setTally((t) => ({
            attempted: Math.max(0, t.attempted - 1),
            hit: Math.max(0, t.hit - (hitVal ? 1 : 0)),
          }));
        }
      })();
    },
    [writeLocalTally]
  );

  return { ready, loggedIn, tally, logAttempt };
}

function DiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// The result / mission card. During a spin it flashes the shuffling preview;
// once landed it's a rich, tappable card linking to the full peek page.
function MissionCard({
  peek,
  rolling,
}: {
  peek: RoulettePeek;
  rolling: boolean;
}) {
  const r = rating(peek.baseSuccessRate, peek.workedVotes, peek.voteCount);
  const inner = (
    <div
      className={`overflow-hidden rounded-card border border-border bg-card shadow-sm transition-transform ${
        rolling ? "scale-[0.99]" : "peek-lift"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {peek.videoUrl ? (
          <video
            src={`${peek.videoUrl}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            aria-hidden
            {...{ "webkit-playsinline": "true" }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : peek.posterUrl ? (
          <Image
            src={peek.posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        ) : (
          <div className="placeholder-stripes h-full w-full" />
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
            {peek.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted">{peek.floorName}</p>
        </div>
        <GradeBadge label={r.label} score={r.score} size="lg" />
      </div>
    </div>
  );

  // While rolling the card isn't a link yet (the target keeps changing).
  if (rolling) return <div aria-hidden>{inner}</div>;
  return (
    <Link href={`/peeks/${peek.slug}`} className="group block">
      {inner}
    </Link>
  );
}

export function RouletteGame({
  map,
  peeks,
}: {
  map: { slug: string; name: string };
  peeks: RoulettePeek[];
}) {
  const peekIds = useMemo(() => peeks.map((p) => p.id), [peeks]);
  const { loggedIn, tally, logAttempt } = useRouletteSession(map.slug, peekIds);

  const [minGrade, setMinGrade] = useState<MinGradeValue>("any");
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<RoulettePeek | null>(null); // shown card
  const [checkedIn, setCheckedIn] = useState(false);
  const [nudge, setNudge] = useState(false);

  const lastIdRef = useRef<string | null>(null);
  const diceRef = useRef<HTMLSpanElement>(null);
  const rollTimer = useRef<number | null>(null);
  const rollInterval = useRef<number | null>(null);

  // Restore the persisted min-grade filter.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MIN_GRADE_STORAGE_KEY);
      if (saved && MIN_GRADE_OPTIONS.some((o) => o.value === saved)) {
        setMinGrade(saved as MinGradeValue);
      }
    } catch {
      // keep default
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rollTimer.current) window.clearTimeout(rollTimer.current);
      if (rollInterval.current) window.clearInterval(rollInterval.current);
    };
  }, []);

  const pool = useMemo(
    () => filterByMinGrade(peeks, minGrade),
    [peeks, minGrade]
  );

  function chooseFilter(next: MinGradeValue) {
    setMinGrade(next);
    try {
      window.localStorage.setItem(MIN_GRADE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function spin() {
    if (rolling || pool.length === 0) return;
    setCheckedIn(false);
    setNudge(false);

    // Kick the dice spin animation (restart trick: remove → reflow → add).
    const el = diceRef.current;
    if (el && !reducedMotion()) {
      el.classList.remove("peek-rp-tap-spin");
      void el.offsetWidth;
      el.classList.add("peek-rp-tap-spin");
    }

    const finalPick = pickRandomPeek(pool, lastIdRef.current);
    if (!finalPick) return;

    if (reducedMotion()) {
      lastIdRef.current = finalPick.id;
      setDisplay(finalPick);
      return;
    }

    // Slot-machine shuffle: flash random peeks, then land on the final pick.
    setRolling(true);
    rollInterval.current = window.setInterval(() => {
      const flash = pool[Math.floor(Math.random() * pool.length)];
      if (flash) setDisplay(flash);
    }, 80);
    rollTimer.current = window.setTimeout(() => {
      if (rollInterval.current) window.clearInterval(rollInterval.current);
      rollInterval.current = null;
      lastIdRef.current = finalPick.id;
      setDisplay(finalPick);
      setRolling(false);
    }, 700);
  }

  function checkIn(hit: boolean) {
    if (!display || rolling || checkedIn) return;
    logAttempt(display.id, hit);
    setCheckedIn(true);
    if (!loggedIn) {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 4000);
    }
  }

  const poolEmpty = pool.length === 0;

  return (
    <div>
      {/* Min-grade filter. */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Minimum grade
        </span>
        <div
          role="group"
          aria-label="Minimum grade filter"
          className="inline-flex rounded-btn border border-border bg-card p-1 shadow-sm"
        >
          {MIN_GRADE_OPTIONS.map((o) => {
            const active = minGrade === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => chooseFilter(o.value)}
                className={`rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spin button. */}
      <div className="mb-8 flex flex-col items-center">
        <button
          type="button"
          onClick={spin}
          disabled={rolling || poolEmpty}
          className="peek-rp-btn inline-flex items-center gap-2.5 rounded-btn bg-brand px-7 py-3.5 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span ref={diceRef} aria-hidden className="peek-rp-btn-dice inline-flex">
            <DiceIcon />
          </span>
          <span>{display ? "Spin again" : "Spin the wheel"}</span>
        </button>
        {poolEmpty && (
          <p className="mt-3 text-center text-sm text-muted">
            No peeks match that grade on {map.name} — loosen the filter.
          </p>
        )}
      </div>

      {/* Result / mission. */}
      {display ? (
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
            {rolling ? "Rolling…" : "Your mission — hit this peek"}
          </p>
          <MissionCard peek={display} rolling={rolling} />

          {!rolling && !checkedIn && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => checkIn(true)}
                className="peek-lift rounded-btn border border-border bg-card px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
              >
                ✅ Hit it
              </button>
              <button
                type="button"
                onClick={() => checkIn(false)}
                className="peek-lift rounded-btn border border-border bg-card px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
              >
                ❌ Missed
              </button>
            </div>
          )}

          {!rolling && checkedIn && (
            <div className="mt-5 text-center">
              <p className="text-sm text-ink">
                <span className="font-semibold">Today on {map.name}:</span>{" "}
                {tally.attempted} attempted · {tally.hit} hit
              </p>
              <button
                type="button"
                onClick={spin}
                disabled={poolEmpty}
                className="mt-3 text-sm font-semibold text-brand hover:underline disabled:text-muted disabled:no-underline"
              >
                Spin again →
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          Spin to get your mission — a random peek to go hit on {map.name}.
        </p>
      )}

      {/* Logged-out conversion nudge — same pattern as the favorites hearts. */}
      {nudge && (
        <div
          className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-2.5 shadow-lg">
            <span className="text-sm text-ink">
              Log in to track your attempts
            </span>
            <Link
              href="/login"
              className="shrink-0 text-sm font-semibold text-brand hover:underline"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
