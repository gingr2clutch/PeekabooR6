"use client";

import { useEffect, useMemo, useState } from "react";
import { MiniMapPicker } from "@/components/MiniMapPicker";
import { supabasePublic } from "@/lib/supabase";

type Floor = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
};
type MapWithFloors = {
  id: string;
  slug: string;
  name: string;
  floors: Floor[];
};

type Props = { maps: MapWithFloors[] };
type Status = "idle" | "submitting" | "success" | "error";

const MAX_NAME = 80;

// Strict TikTok host check — the field's purpose is the TikTok clip.
// Non-TikTok URLs would still work technically (the admin approve action
// would route them to video_url) but the label promises a TikTok URL,
// so we reject the rest at submission time to match the UX.
function validateTiktokUrl(s: string): string | null {
  const v = s.trim();
  if (!v) return null; // optional
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "Must be a valid URL.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "Must start with http:// or https://.";
  }
  const host = u.hostname.toLowerCase();
  if (host !== "tiktok.com" && !host.endsWith(".tiktok.com")) {
    return "Must be a tiktok.com link.";
  }
  return null;
}

export function SubmitPeekForm({ maps }: Props) {
  const initialMap = maps[0]?.slug ?? "";
  const initialFloor = maps[0]?.floors[0]?.slug ?? "";

  const [mapSlug, setMapSlug] = useState(initialMap);
  const [floorSlug, setFloorSlug] = useState(initialFloor);
  const [pinCoords, setPinCoords] = useState<{ x: number; y: number } | null>(
    null
  );
  const [name, setName] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [agreeHashtag, setAgreeHashtag] = useState(false);
  const [agreeQuality, setAgreeQuality] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tiktokUrlError, setTiktokUrlError] = useState<string | null>(null);

  const selectedMap = useMemo(
    () => maps.find((m) => m.slug === mapSlug) ?? null,
    [maps, mapSlug]
  );
  const selectedFloor = useMemo(
    () => selectedMap?.floors.find((f) => f.slug === floorSlug) ?? null,
    [selectedMap, floorSlug]
  );

  // Pin position belongs to a specific floor — clear it when the user
  // changes floor (which also fires when changing map, since the map
  // change picks a new default floor).
  useEffect(() => {
    setPinCoords(null);
  }, [floorSlug]);

  function onMapChange(slug: string) {
    setMapSlug(slug);
    const next = maps.find((m) => m.slug === slug);
    setFloorSlug(next?.floors[0]?.slug ?? "");
  }

  function resetAfterSuccess() {
    setName("");
    setTiktokUrl("");
    setPinCoords(null);
    setAgreeHashtag(false);
    setAgreeQuality(false);
    setTiktokUrlError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    // Honeypot: bots fill all fields. Pretend success and skip the write.
    if (honeypot.trim() !== "") {
      setStatus("success");
      resetAfterSuccess();
      return;
    }

    if (!agreeHashtag || !agreeQuality) {
      setErrorMsg("Please confirm the submission guidelines.");
      setStatus("error");
      return;
    }

    const trimmedName = name.trim();
    if (!mapSlug || !floorSlug || !trimmedName) {
      setErrorMsg("Please fill in the required fields.");
      setStatus("error");
      return;
    }

    if (!pinCoords) {
      setErrorMsg("Tap the map to drop a pin where the peek is.");
      setStatus("error");
      return;
    }

    const tiktokErr = validateTiktokUrl(tiktokUrl);
    if (tiktokErr) {
      setTiktokUrlError(tiktokErr);
      setStatus("error");
      setErrorMsg(null);
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);
    setTiktokUrlError(null);

    // Payload uses the existing peek_submissions schema:
    // - the user's "Name" goes into peek_description (admin approve uses
    //   this as the draft peek's name; we cap input at 80 chars so the
    //   admin truncation never kicks in).
    // - TikTok URL goes into clip_url; the approve action recognises
    //   tiktok.com hosts and routes to tiktok_url on the new peek.
    // - removed fields (location_description, pro_tip, submitter_*) are
    //   stored as null.
    const payload = {
      map_slug: mapSlug,
      floor_slug: floorSlug,
      pin_x: pinCoords.x,
      pin_y: pinCoords.y,
      location_description: null,
      peek_description: trimmedName,
      pro_tip: null,
      clip_url: tiktokUrl.trim() || null,
      submitter_name: null,
      submitter_email: null,
      status: "pending",
    };

    const { error } = await supabasePublic()
      .from("peek_submissions")
      .insert(payload);

    if (error) {
      console.error("submission insert failed:", error);
      setErrorMsg("Something went wrong, try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
    resetAfterSuccess();
  }

  if (status === "success") {
    return (
      <div className="rounded-card border border-border bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-ink">
          Thanks — submission received.
        </h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll review and add it if it checks out. You&apos;ll get credit
          if you submitted a name.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setErrorMsg(null);
          }}
          className="mt-4 inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99]"
        >
          Submit another
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";
  const labelCls = "block text-xs text-muted";
  const submitting = status === "submitting";
  const submitDisabled =
    submitting || !pinCoords || !agreeHashtag || !agreeQuality;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]"
    >
      <input
        type="text"
        name="honeypot"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden
        style={{ display: "none" }}
      />

      <section className="rounded-btn border border-brand/30 bg-brand/[0.05] p-4">
        <h2 className="text-sm font-semibold text-ink">Before you submit</h2>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreeHashtag}
              onChange={(e) => setAgreeHashtag(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
            />
            <span>
              I&apos;ll use/add #peekaboor6 if this clip is on TikTok
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreeQuality}
              onChange={(e) => setAgreeQuality(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
            />
            <span>
              My clip is high quality — clear gameplay, peek angle visible
            </span>
          </label>
        </div>
        <a
          href="https://www.tiktok.com/@peekaboo_r6"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand/80"
        >
          Follow @peekaboo_r6 on TikTok for new peeks →
        </a>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="mb-1 block">Map *</span>
          <select
            required
            value={mapSlug}
            onChange={(e) => onMapChange(e.target.value)}
            className={inputCls}
          >
            {maps.length === 0 && <option value="">No maps yet</option>}
            {maps.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">Floor *</span>
          <select
            required
            value={floorSlug}
            onChange={(e) => setFloorSlug(e.target.value)}
            disabled={!selectedMap || selectedMap.floors.length === 0}
            className={inputCls}
          >
            {(!selectedMap || selectedMap.floors.length === 0) && (
              <option value="">No floors</option>
            )}
            {selectedMap?.floors.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className={`${labelCls} mb-1`}>Where on the map? *</span>
        <MiniMapPicker
          mapSlug={mapSlug || null}
          floorSlug={floorSlug || null}
          birdsEyeUrl={selectedFloor?.birds_eye_url ?? null}
          value={pinCoords}
          onChange={setPinCoords}
        />
      </div>

      <label className={labelCls}>
        <span className="mb-1 block">Name of the peek *</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder="e.g. Tellers hallway"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">TikTok URL</span>
        <input
          type="url"
          value={tiktokUrl}
          onChange={(e) => {
            setTiktokUrl(e.target.value);
            if (tiktokUrlError) {
              setTiktokUrlError(validateTiktokUrl(e.target.value));
            }
          }}
          onBlur={(e) => setTiktokUrlError(validateTiktokUrl(e.target.value))}
          placeholder="https://www.tiktok.com/@you/video/..."
          className={inputCls}
          aria-invalid={tiktokUrlError ? "true" : undefined}
        />
        {tiktokUrlError && (
          <span className="mt-1 block text-[11px] text-red-600">
            {tiktokUrlError}
          </span>
        )}
      </label>

      {status === "error" && errorMsg && (
        <p className="text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">* required</p>
        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit peek"}
        </button>
      </div>
    </form>
  );
}
