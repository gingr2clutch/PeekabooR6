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

function isHttpUrl(s: string): boolean {
  if (!s) return true; // empty is allowed
  return /^https?:\/\//i.test(s.trim());
}

export function SubmitPeekForm({ maps }: Props) {
  const initialMap = maps[0]?.slug ?? "";
  const initialFloor = maps[0]?.floors[0]?.slug ?? "";

  const [mapSlug, setMapSlug] = useState(initialMap);
  const [floorSlug, setFloorSlug] = useState(initialFloor);
  const [pinCoords, setPinCoords] = useState<{ x: number; y: number } | null>(
    null
  );
  const [locationDesc, setLocationDesc] = useState("");
  const [peekDesc, setPeekDesc] = useState("");
  const [proTip, setProTip] = useState("");
  const [clipUrl, setClipUrl] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [agreeHashtag, setAgreeHashtag] = useState(false);
  const [agreeQuality, setAgreeQuality] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clipUrlError, setClipUrlError] = useState<string | null>(null);

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
    setLocationDesc("");
    setPeekDesc("");
    setProTip("");
    setClipUrl("");
    setSubmitterName("");
    setSubmitterEmail("");
    setPinCoords(null);
    setAgreeHashtag(false);
    setAgreeQuality(false);
    setClipUrlError(null);
  }

  function validateClipUrl(v: string): string | null {
    if (!v.trim()) return null;
    if (!isHttpUrl(v)) return "Link must start with http:// or https://";
    return null;
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

    if (!mapSlug || !floorSlug || !peekDesc.trim()) {
      setErrorMsg("Please fill in the required fields.");
      setStatus("error");
      return;
    }

    if (!pinCoords) {
      setErrorMsg("Tap the map to drop a pin where the peek is.");
      setStatus("error");
      return;
    }

    const clipErr = validateClipUrl(clipUrl);
    if (clipErr) {
      setClipUrlError(clipErr);
      setStatus("error");
      setErrorMsg(null);
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);
    setClipUrlError(null);

    const payload = {
      map_slug: mapSlug,
      floor_slug: floorSlug,
      pin_x: pinCoords.x,
      pin_y: pinCoords.y,
      location_description: locationDesc.trim() || null,
      peek_description: peekDesc.trim(),
      pro_tip: proTip.trim() || null,
      clip_url: clipUrl.trim() || null,
      submitter_name: submitterName.trim() || null,
      submitter_email: submitterEmail.trim() || null,
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
        <span className="mb-1 block">Location description</span>
        <input
          type="text"
          value={locationDesc}
          onChange={(e) => setLocationDesc(e.target.value)}
          placeholder="Extra detail (optional) — e.g. crouched behind the railing, not standing"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">Peek description *</span>
        <textarea
          required
          rows={3}
          value={peekDesc}
          onChange={(e) => setPeekDesc(e.target.value)}
          placeholder="What you're aiming at, why it works"
          className={`${inputCls} resize-y`}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">Pro tip</span>
        <textarea
          rows={2}
          value={proTip}
          onChange={(e) => setProTip(e.target.value)}
          placeholder="Any extra tip — timing, angle, common mistakes to avoid"
          className={`${inputCls} resize-y`}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">Clip / video</span>
        <input
          type="url"
          value={clipUrl}
          onChange={(e) => {
            setClipUrl(e.target.value);
            if (clipUrlError) setClipUrlError(validateClipUrl(e.target.value));
          }}
          onBlur={(e) => setClipUrlError(validateClipUrl(e.target.value))}
          placeholder="Paste a TikTok, YouTube, Twitch, or Medal link of the peek in action"
          className={inputCls}
          aria-invalid={clipUrlError ? "true" : undefined}
        />
        {clipUrlError && (
          <span className="mt-1 block text-[11px] text-red-600">
            {clipUrlError}
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="mb-1 block">Your name</span>
          <input
            type="text"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="For credit (optional)"
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">Email</span>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="If we have questions (optional)"
            className={inputCls}
          />
        </label>
      </div>

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
