'use client';

/**
 * PeekabooIntro — 5s cinematic lock-on intro that flies into the real nav + stats bar.
 *
 * Wiring (3 things):
 *  1. Render <PeekabooIntro stats={{ maps, peeks, votes, tier }} /> once, at the top of the homepage.
 *  2. Add data-intro-target="mark" | "word" | "stats" to the real nav logo tile, nav wordmark, and stats bar.
 *  3. Add className="reveal" (+ style={{ '--i': n }}) to whatever else should stagger in, and paste the
 *     small global CSS block from intro-globals.css into globals.css.
 *
 * Plays once per session (sessionStorage). Skipped entirely under prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react';
import s from './PeekabooIntro.module.css';

type Stats = { maps: number; peeks: number; votes: number; tier: number };

const SESSION_KEY = 'pbr6_intro_seen';

// ms → class to add
const TIMELINE: Array<[number, string]> = [
  [150, 'isDot'],
  [300, 'isFrame'],
  [950, 'isLock'],
  [1550, 'isWord'],
  [2100, 'isR6'],
  [2350, 'isTag'],
  [2750, 'isStats'],
  [3850, 'isExit'],
];

const POS = { tl: 'pTL', tr: 'pTR', br: 'pBR', bl: 'pBL' } as const;
const Bracket = ({ pos }: { pos: keyof typeof POS }) => (
  <span className={`${s.br} ${s[POS[pos]]}`}>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 14V2h12" />
    </svg>
  </span>
);

const icons = {
  maps: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  peeks: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  votes: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  ),
  tier: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 5M16 6h3a3 3 0 0 1-3 5M12 13v4M9 20h6" />
    </svg>
  ),
};

const LABELS: Record<keyof Stats, string> = { maps: 'Maps', peeks: 'Peeks', votes: 'Votes', tier: 'S/A+ Tier' };
const ORDER: Array<keyof Stats> = ['maps', 'peeks', 'votes', 'tier'];

function shouldPlay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  // A hash is an explicit destination (/#submit from the nav button and the
  // site-wide banner). Landing there must reach the form, not a 5s overlay.
  if (window.location.hash) return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
  } catch {}
  return true;
}

export default function PeekabooIntro({ stats }: { stats: Stats }) {
  // Decide synchronously on the client so there's no flash of the page underneath.
  const [active, setActive] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Set<string>>(() => new Set());
  const [counts, setCounts] = useState<Stats>({ maps: 0, peeks: 0, votes: 0, tier: 0 });
  const [gone, setGone] = useState(false);
  const [handed, setHanded] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const statsEl = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const play = shouldPlay();
    setActive(play);
    if (!play) {
      document.body.classList.add('is-live');
      return;
    }
    document.body.setAttribute('data-intro-pending', '');
    document.body.classList.add('intro-locked');
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = root.current!;
    const add = (c: string) => setPhase((p) => new Set(p).add(c));
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const target = (name: string) => document.querySelector<HTMLElement>(`[data-intro-target="${name}"]`);

    const placeHairlines = () => {
      const r = mark.current!.getBoundingClientRect();
      el.style.setProperty('--my1', `${r.top}px`);
      el.style.setProperty('--my2', `${r.bottom}px`);
      el.style.setProperty('--mx1', `${r.left}px`);
      el.style.setProperty('--mx2', `${r.right}px`);
    };

    const flip = (from: HTMLElement | null, to: HTMLElement | null, ms: number) => {
      if (!from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      from.animate(
        [
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})` },
        ],
        { duration: ms, easing: 'cubic-bezier(.7,0,.15,1)', fill: 'forwards' },
      );
    };

    const countUp = (ms: number) => {
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const frame = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        const e = ease(p);
        setCounts({
          maps: Math.round(stats.maps * e),
          peeks: Math.round(stats.peeks * e),
          votes: Math.round(stats.votes * e),
          tier: Math.round(stats.tier * e),
        });
        if (p < 1 && !doneRef.current) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const finish = (skipped: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      timers.current.forEach(clearTimeout);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      document.body.removeAttribute('data-intro-pending');
      document.body.classList.add('is-live');
      document.body.classList.remove('intro-locked');
      if (skipped) {
        setGone(true);
        window.setTimeout(() => setActive(false), 400);
      } else {
        setActive(false);
      }
    };

    placeHairlines();
    requestAnimationFrame(() => {
      add('isOn');
      TIMELINE.forEach(([ms, cls]) => at(ms, () => add(cls)));
      at(2750, () => countUp(950));
      at(3850, () => {
        flip(mark.current, target('mark'), 780);
        flip(word.current, target('word'), 780);
        flip(statsEl.current, target('stats'), 820);
      });
      at(4000, () => document.body.classList.add('is-live'));
      at(4680, () => {
        document.body.removeAttribute('data-intro-pending');
        setHanded(true);
      });
      at(4750, () => setGone(true));
      at(5150, () => finish(false));
    });

    const skip = () => finish(true);
    const onKey = (e: KeyboardEvent) => {
      if (['Tab', 'Shift', 'Alt', 'Meta', 'Control'].includes(e.key)) return;
      skip();
    };
    const onResize = () => { if (!doneRef.current && !el.classList.contains(s.isExit)) placeHairlines(); };
    el.addEventListener('click', skip);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      timers.current.forEach(clearTimeout);
      el.removeEventListener('click', skip);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      // Unmount before finish() — e.g. browser-back mid-intro. Without this the
      // body keeps intro-locked (no scroll) and data-intro-pending (invisible
      // nav + stats) forever. Restore the page exactly as finish() would.
      if (!doneRef.current) {
        document.body.removeAttribute('data-intro-pending');
        document.body.classList.remove('intro-locked');
        document.body.classList.add('is-live');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  const cls = [s.intro, ...Array.from(phase).map((p) => s[p]), gone ? s.isGone : ''].join(' ');
  const clone = handed ? s.handed : '';

  return (
    <div ref={root} className={cls} role="status" aria-label="peekabooR6 is loading">
      <div className={`${s.band} ${s.bandT}`} />
      <div className={`${s.band} ${s.bandB}`} />
      <div className={`${s.hair} ${s.hairHA}`} />
      <div className={`${s.hair} ${s.hairHB}`} />
      <div className={`${s.hair} ${s.hairVA}`} />
      <div className={`${s.hair} ${s.hairVB}`} />

      <div className={s.stage}>
        <div className={s.lockup}>
          <div className={s.markWrap}>
            <div ref={mark} className={`${s.mark} ${s.flip} ${clone}`}>
              <div className={s.tile} />
              <div className={s.ring} />
              <Bracket pos="tl" /><Bracket pos="tr" /><Bracket pos="br" /><Bracket pos="bl" />
              <div className={s.dot} />
            </div>
          </div>
          <div ref={word} className={`${s.word} ${s.flip} ${clone}`}>
            peekaboo<b>R6</b>
          </div>
        </div>

        <div className={s.tag}>Know where they peek before they do.</div>

        <div className={s.statsWrap}>
          <div ref={statsEl} className={`${s.stats} ${s.flip} ${clone}`}>
            {ORDER.map((k) => (
              <div className={s.cell} key={k}>
                <div className={s.num}>
                  {icons[k]}
                  <span>{counts[k].toLocaleString('en-US')}</span>
                </div>
                <div className={s.lbl}>{LABELS[k]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className={s.skip}>Skip</button>
      <div className={s.prog} />
    </div>
  );
}
