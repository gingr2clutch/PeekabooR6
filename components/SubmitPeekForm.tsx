"use client";

import { useMemo, useState } from "react";
import { supabasePublic } from "@/lib/supabase";

type Floor = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
};
type MapWithFloors = {
  id: string;
  slug: string;
  name: string;
  floors: Floor[];
};

type Props = { maps: MapWithFloors[] };
type Status = "idle" | "submitting" | "success" | "error";

export function SubmitPeekForm({ maps }: Props) {
  const initialMap = maps[0]?.slug ?? "";
  const initialFloor = maps[0]?.floors[0]?.slug ?? "";

  const [mapSlug, setMapSlug] = useState(initialMap);
  const [floorSlug, setFloorSlug] = useState(initialFloor);
  const [locationDesc, setLocationDesc] = useState("");
  const [peekDesc, setPeekDesc] = useState("");
  const [operatorSuggestions, setOperatorSuggestions] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedMap = useMemo(
    () => maps.find((m) => m.slug === mapSlug) ?? null,
    [maps, mapSlug]
  );

  function onMapChange(slug: string) {
    setMapSlug(slug);
    const next = maps.find((m) => m.slug === slug);
    setFloorSlug(next?.floors[0]?.slug ?? "");
  }

  function resetTextFields() {
    setLocationDesc("");
    setPeekDesc("");
    setOperatorSuggestions("");
    setSubmitterName("");
    setSubmitterEmail("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    // Honeypot: bots fill all fields. Pretend success and skip the write.
    if (honeypot.trim() !== "") {
      setStatus("success");
      resetTextFields();
      return;
    }

    if (
      !mapSlug ||
      !floorSlug ||
      !locationDesc.trim() ||
      !peekDesc.trim()
    ) {
      setErrorMsg("Please fill in the required fields.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    const payload = {
      map_slug: mapSlug,
      floor_slug: floorSlug,
      location_description: locationDesc.trim(),
      peek_description: peekDesc.trim(),
      operator_suggestions: operatorSuggestions.trim() || null,
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
    resetTextFields();
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Honeypot — hidden from real users, kept in the tab order's blind spot. */}
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

      <label className={labelCls}>
        <span className="mb-1 block">Location description *</span>
        <input
          type="text"
          required
          value={locationDesc}
          onChange={(e) => setLocationDesc(e.target.value)}
          placeholder="e.g. second-floor balcony, north corner"
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
        <span className="mb-1 block">Operator suggestions</span>
        <input
          type="text"
          value={operatorSuggestions}
          onChange={(e) => setOperatorSuggestions(e.target.value)}
          placeholder="e.g. Jackal, Ying"
          className={inputCls}
        />
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
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit peek"}
        </button>
      </div>
    </form>
  );
}
