"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { track } from "@/lib/analytics";
import {
  MAX_UPLOAD_BYTES,
  isAllowedSourceUrl,
  type SubmitConfig,
} from "@/lib/submit-config";

export type SubmitMap = { slug: string; name: string };
export type SubmitSite = { mapSlug: string; name: string };

type Props = {
  config: SubmitConfig;
  maps: SubmitMap[];
  /* Gadget variant only — bomb sites for every map, filtered client-side as
     the map changes, and operator names. Empty for the peek variant. */
  sites?: SubmitSite[];
  operators?: string[];
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatBytes(n: number) {
  return n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
}

// 26 pieces, matching the demo. Appended to <body> and removed on finish, so
// nothing is left in the DOM and the page's own layout is never touched.
function confetti(colors: string[]) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("div");
    s.className = "sub-cf";
    s.style.left = `${8 + Math.random() * 84}vw`;
    s.style.background = colors[i % colors.length];
    document.body.appendChild(s);
    const dur = 1400 + Math.random() * 1200;
    const drift = (Math.random() - 0.5) * 160;
    s.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${
            480 + Math.random() * 540
          }deg)`,
          opacity: 0.85,
        },
      ],
      {
        duration: dur,
        easing: "cubic-bezier(.2,.6,.4,1)",
        delay: Math.random() * 250,
      }
    ).onfinish = () => s.remove();
  }
}

export function SubmitSpot({ config, maps, sites = [], operators = [] }: Props) {
  const isGadget = config.kind === "gadget";

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [hot, setHot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mapSlug, setMapSlug] = useState(maps[0]?.slug ?? "");
  const [site, setSite] = useState("");
  const [operator, setOperator] = useState(operators[0] ?? "");
  const [spot, setSpot] = useState("");
  const [who, setWho] = useState("");

  const [names, setNames] = useState<string[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [avPop, setAvPop] = useState(false);
  const startedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mapName = maps.find((m) => m.slug === mapSlug)?.name ?? "";
  const siteOptions = sites.filter((s) => s.mapSlug === mapSlug);

  // Bomb sites repopulate when the map changes — a site from the previous map
  // would not exist under the new one.
  useEffect(() => {
    setSite(siteOptions[0]?.name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSlug]);

  // Suggestions are fetched, not shipped with the page, so the homepage's
  // payload and query count are unchanged. Re-fetched whenever the narrowing
  // fields change.
  useEffect(() => {
    if (step !== 2 || !mapSlug) return;
    const params = new URLSearchParams({ kind: config.kind, map: mapSlug });
    if (isGadget) {
      if (site) params.set("site", site);
      if (operator) params.set("operator", operator);
    }
    let cancelled = false;
    fetch(`/api/submissions/suggestions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setNames(Array.isArray(d.names) ? d.names : []);
      })
      .catch(() => {
        if (!cancelled) setNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [step, mapSlug, site, operator, config.kind, isGadget]);

  const typed = spot.trim().toLowerCase();
  const exact = names.some((n) => n.toLowerCase() === typed);
  const hits = typed
    ? names.filter((n) => n.toLowerCase().includes(typed)).slice(0, 4)
    : [];
  const isNewSpot = typed.length > 0 && hits.length === 0;

  const hasMedia = !!file || isAllowedSourceUrl(link);

  const go = useCallback(
    (n: number) => {
      setStep(n);
      setError(null);
      track("submit_step", { kind: config.kind, step: n });
    },
    [config.kind]
  );

  // Fires once per visitor, on the first real interaction rather than on
  // render — the section is below the fold, so mounting is not intent.
  const markStarted = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("submit_started", { kind: config.kind });
  }, [config.kind]);

  function pickFile(f: File) {
    markStarted();
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("That file is over 50MB. Trim it or paste a link instead.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let filePath: string | null = null;

      if (file) {
        // Ask for a signed URL first — the route checks declared type and size
        // before it will mint one.
        const res = await fetch("/api/submissions/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");

        // The bytes go straight to Storage, never through the app — Vercel
        // caps request bodies at ~4.5MB, far below the file sizes here.
        const up = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/submissions/${data.path}?token=${encodeURIComponent(data.token)}`,
          {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          }
        );
        if (!up.ok) throw new Error("Upload failed. Try again.");
        filePath = data.path;
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: config.kind,
          map: mapName,
          bomb_site: isGadget ? site || null : null,
          operator: isGadget ? operator || null : null,
          spot_name: spot.trim(),
          is_new_spot: isNewSpot,
          submitter_name: who.trim(),
          source_url: file ? null : link.trim(),
          file_path: filePath,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not save that.");

      track("submit_completed", {
        kind: config.kind,
        map: mapName,
        is_new_spot: isNewSpot,
      });
      setStep(4);
      confetti(config.confetti);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const accentVars = {
    "--sub-accent": config.accent,
    "--sub-accent-d": config.accentDark,
    "--sub-shadow": `${config.accentDark}47`,
  } as CSSProperties;

  const stepLabels = ["DROP CLIP", config.stepTwoLabel, "GET CREDIT"];

  return (
    <section
      id={config.anchorId}
      style={accentVars}
      className="mx-auto mt-16 max-w-[620px] scroll-mt-24"
      aria-labelledby={`${config.anchorId}-title`}
    >
      <div className="px-1 text-center">
        <h2 id={`${config.anchorId}-title`} className="sub-h1">
          {config.heroTitle}
          <span>{config.heroAccent}</span>
        </h2>
        <p className="mt-2.5 text-[14.5px] text-[#6f6a61]">{config.heroSub}</p>
      </div>

      <div className="sub-card mt-7">
        <div className="text-center">
          <h3 className="sub-h2">
            {config.cardTitle}
            <em>{config.cardTitleAccent}</em>
          </h3>
          <p className="mt-[3px] text-[13px] text-[#6f6a61]">{config.cardTag}</p>
        </div>

        <div className="sub-steps">
          {stepLabels.map((lb, i) => {
            const n = i + 1;
            const on = step === n || (step === 4 && n === 3);
            return (
              <div
                key={lb}
                className={`sub-step ${on ? "is-on" : ""} ${step > n ? "is-done" : ""}`}
              >
                <div className="sub-dot">{n}</div>
                <div className="sub-lb">{lb}</div>
              </div>
            );
          })}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="sub-pane">
            <button
              type="button"
              onClick={() => {
                markStarted();
                fileRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setHot(true);
              }}
              onDragLeave={() => setHot(false)}
              onDrop={(e) => {
                e.preventDefault();
                setHot(false);
                const f = e.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              className={`sub-dz ${hot ? "is-hot" : ""} ${file ? "is-set" : ""}`}
            >
              <span className="sub-big" aria-hidden>
                🎬
              </span>
              <span className="sub-t1 block">
                {file ? `✓ ${file.name}` : config.dropTitle}
              </span>
              <span className="sub-t2 block">
                {file ? (
                  <>
                    ready to go — hit <b>Next</b>
                  </>
                ) : (
                  <>
                    or <b>click to browse</b> · {config.dropSub}
                  </>
                )}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={config.accept}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />

            <div className="sub-or">OR PASTE A LINK</div>
            <input
              className="sub-input"
              value={link}
              onChange={(e) => {
                markStarted();
                setLink(e.target.value);
              }}
              placeholder="tiktok.com / youtube.com / medal.tv link…"
              inputMode="url"
            />
            {error && <p className="sub-hint is-new">{error}</p>}
            <button
              type="button"
              className="sub-btn"
              disabled={!hasMedia}
              onClick={() => go(2)}
            >
              {config.nextOneLabel}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="sub-pane">
            {file && (
              <div className="sub-chip">
                <div className="sub-ic" aria-hidden>
                  ▶
                </div>
                <div className="sub-nm">{file.name}</div>
                <div className="sub-sz">{formatBytes(file.size)}</div>
                <div className="sub-ok" aria-hidden>
                  ✓
                </div>
              </div>
            )}

            <div className="sub-frow">
              <div>
                <label className="sub-label" htmlFor={`${config.anchorId}-map`}>
                  MAP
                </label>
                <div className="sub-selwrap">
                  <select
                    id={`${config.anchorId}-map`}
                    className="sub-select"
                    value={mapSlug}
                    onChange={(e) => setMapSlug(e.target.value)}
                  >
                    {maps.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isGadget ? (
                <div>
                  <label className="sub-label" htmlFor={`${config.anchorId}-site`}>
                    BOMB SITE
                  </label>
                  <div className="sub-selwrap">
                    <select
                      id={`${config.anchorId}-site`}
                      className="sub-select"
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                    >
                      {siteOptions.length === 0 && <option value="">—</option>}
                      {siteOptions.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <SpotField
                  config={config}
                  spot={spot}
                  setSpot={setSpot}
                  hits={hits}
                  exact={exact}
                  sugOpen={sugOpen}
                  setSugOpen={setSugOpen}
                />
              )}
            </div>

            {isGadget && (
              <div className="sub-frow">
                <div>
                  <label className="sub-label" htmlFor={`${config.anchorId}-op`}>
                    OPERATOR
                  </label>
                  <div className="sub-selwrap">
                    <select
                      id={`${config.anchorId}-op`}
                      className="sub-select"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    >
                      {operators.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <SpotField
                  config={config}
                  spot={spot}
                  setSpot={setSpot}
                  hits={hits}
                  exact={exact}
                  sugOpen={sugOpen}
                  setSugOpen={setSugOpen}
                />
              </div>
            )}

            <div className={`sub-hint ${isNewSpot ? "is-new" : ""}`}>
              {exact ? (
                <>
                  ✓ Matched — your clip gets added to <b>{spot.trim()}</b>.
                </>
              ) : isNewSpot ? (
                <>
                  👀 We don&rsquo;t have this one — submit it as a{" "}
                  <b>{config.hintNew}</b> and claim the <b>FIRST FIND</b> badge.
                </>
              ) : (
                config.hintIdle
              )}
            </div>

            <button
              type="button"
              className="sub-btn"
              disabled={!spot.trim()}
              onClick={() => go(3)}
            >
              Next → get credit
            </button>
            <button type="button" className="sub-back" onClick={() => go(1)}>
              ← back
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="sub-pane text-center">
            <label className="sub-label" htmlFor={`${config.anchorId}-who`}>
              YOUR NAME OR HANDLE
            </label>
            <input
              id={`${config.anchorId}-who`}
              className="sub-input mx-auto block max-w-[320px] text-center"
              value={who}
              maxLength={24}
              placeholder="e.g. gingr2clutch"
              onChange={(e) => {
                setWho(e.target.value);
                setAvPop(true);
                window.setTimeout(() => setAvPop(false), 320);
              }}
            />

            <div className="sub-credprev">
              <div className="sub-k">
                YOUR NAME, LIVE ON THE {spot.trim().toUpperCase()}{" "}
                {config.previewSuffix}:
              </div>
              <div className="sub-mini">
                <div className={`sub-vid ${isGadget ? "is-gadget" : ""}`}>
                  {isGadget ? (
                    <span className="sub-pin" aria-hidden>
                      📍
                    </span>
                  ) : (
                    <span className="sub-play" aria-hidden>
                      ▶
                    </span>
                  )}
                  <span className="sub-gr" aria-hidden>
                    {isGadget ? (operator[0] ?? "V") : "S"}
                  </span>
                </div>
                <div className="sub-bd">
                  <div className="sub-pn">
                    {spot.trim()}
                    {isNewSpot ? " 🆕" : ""}
                  </div>
                  <div className="sub-pl">
                    {mapName}
                    {isGadget && site ? ` · ${site}` : ""}
                  </div>
                  <div className="sub-by">
                    <span className={`sub-av ${avPop ? "is-pop" : ""}`} aria-hidden>
                      {(who.trim()[0] ?? "?").toUpperCase()}
                    </span>
                    {config.creditVerb}&nbsp;<b>{who.trim() || "you"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="sub-hint">
              No account needed. We review every submission before it goes live.
            </div>
            {error && <p className="sub-hint is-new">{error}</p>}
            <button
              type="button"
              className="sub-btn"
              disabled={!who.trim() || busy}
              onClick={submit}
            >
              {busy ? "Sending…" : config.submitLabel}
            </button>
            <button
              type="button"
              className="sub-back"
              onClick={() => go(2)}
              disabled={busy}
            >
              ← back
            </button>
          </div>
        )}

        {/* DONE */}
        {step === 4 && (
          <div className="sub-pane">
            <div className="sub-done">
              <div className="sub-ring" aria-hidden>
                ✅
              </div>
              <h3>{config.doneTitle}</h3>
              <p>
                We review submissions within <b>48 hours</b>. If it makes the
                cut, <b>{who.trim()}</b> {config.doneBody}
              </p>
              <button
                type="button"
                className="sub-btn"
                onClick={() => {
                  setFile(null);
                  setLink("");
                  setSpot("");
                  setWho("");
                  setStep(1);
                }}
              >
                Submit another
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// The type-in plus its suggestion list. Shared so the peek layout (map + spot)
// and the gadget layout (map + site / operator + spot) render the same field.
function SpotField({
  config,
  spot,
  setSpot,
  hits,
  exact,
  sugOpen,
  setSugOpen,
}: {
  config: SubmitConfig;
  spot: string;
  setSpot: (v: string) => void;
  hits: string[];
  exact: boolean;
  sugOpen: boolean;
  setSugOpen: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="sub-label" htmlFor={`${config.anchorId}-spot`}>
        {config.spotLabel}
      </label>
      <div className="sub-pkwrap">
        <input
          id={`${config.anchorId}-spot`}
          className="sub-input"
          value={spot}
          autoComplete="off"
          placeholder={config.spotPlaceholder}
          onChange={(e) => {
            setSpot(e.target.value);
            setSugOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setSugOpen(false), 120)}
        />
        {sugOpen && hits.length > 0 && !exact && (
          <div className="sub-sug">
            {hits.map((n) => (
              <button
                key={n}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSpot(n);
                  setSugOpen(false);
                }}
              >
                📍 {n}
                <span className="sub-sg" aria-hidden>
                  ✓
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
