"use client";

import { useState } from "react";
import { ContributorField } from "@/components/ContributorField";
import { GadgetClipUpload } from "@/components/GadgetClipUpload";
import { MultiPinPlacer } from "@/components/MultiPinPlacer";
import type { Contributor } from "@/lib/contributors";
import { publishGadgetSubmissionAction } from "../../community-actions";

export type SiteOption = {
  id: string;
  name: string;
  mapName: string;
  published: boolean;
  blueprintUrl: string | null;
};
export type OperatorOption = { id: string; name: string };

type Props = {
  submissionId: string;
  /** The submitter's own words — how many pins, and where. */
  spotText: string;
  submitterName: string;
  suggestedEmbed: string;
  sites: SiteOption[];
  operators: OperatorOption[];
  contributors: Contributor[];
  initialSiteId: string;
  initialOperatorId: string;
  creditedName: string | null;
};

const field =
  "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-blue";

// The gadget half of Edit & publish.
//
// A client component because three things have to react to each other: picking
// a site swaps the blueprint the pins are placed on, and it also decides
// whether the draft-site warning shows. A server form could not do either
// without a round trip per change.
//
// The submitter's spot text is pinned at the top on purpose. It is the only
// record of how many pins they meant and where — "Garage, CCTV, Construction"
// is three — and it is not stored on the setup, so it has to be readable while
// the pins are being placed rather than a tab away.
export function GadgetPublishForm({
  submissionId,
  spotText,
  submitterName,
  suggestedEmbed,
  sites,
  operators,
  contributors,
  initialSiteId,
  initialOperatorId,
  creditedName,
}: Props) {
  const [siteId, setSiteId] = useState(initialSiteId);
  const [operatorId, setOperatorId] = useState(initialOperatorId);
  const site = sites.find((s) => s.id === siteId) ?? null;

  return (
    <form action={publishGadgetSubmissionAction.bind(null, submissionId)} className="space-y-4">
      {/* What they actually sent. Kept in view while placing pins. */}
      <div className="rounded-card border border-blue/30 bg-blue/[0.06] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          They described
        </div>
        <p className="mt-1 text-base font-semibold text-ink">{spotText}</p>
        <p className="mt-1 text-xs text-muted">
          from {submitterName} — drop one pin per spot named above
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Bomb site</span>
        <select
          name="site_id"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          required
          className={field}
        >
          <option value="">Pick a bomb site…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.mapName} · {s.name}
              {s.published ? "" : "  (DRAFT)"}
            </option>
          ))}
        </select>
      </label>

      {/* The blocker, named. Three of the queued submissions land on draft
          Clubhouse sites whose names do not match what the submitter typed, so
          silence here would produce a setup that is live in the database and
          invisible on the site. */}
      {site && !site.published && (
        <p className="rounded-card border border-brand bg-brand/10 p-3 text-sm text-ink">
          <span className="font-semibold">
            “{site.mapName} · {site.name}” is a draft bomb site.
          </span>{" "}
          You can save this setup now, but it will NOT appear on the public site
          until you publish that site — open it from Gadgets → {site.mapName} and
          hit Publish.
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Operator</span>
        <select
          name="operator_id"
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          required
          className={field}
        >
          <option value="">Pick an operator…</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          Setup name — blank becomes “Setup N”
        </span>
        <input name="name" placeholder="Standard" className={field} />
      </label>

      <div>
        <span className="mb-1 block text-xs text-muted">
          Clip — their link is prefilled; upload a file instead if you prefer
        </span>
        <input
          name="embed_url"
          defaultValue={suggestedEmbed}
          placeholder="https://medal.tv/games/r6-siege/clips/…"
          className={field}
        />
        <div className="mt-2">
          <GadgetClipUpload siteId={siteId || "pending"} />
        </div>
        <span className="mt-1 block text-[11px] text-muted">
          A Medal link is embedded on the page. Uploading a file overrides it.
        </span>
      </div>

      <div>
        <span className="mb-1 block text-xs text-muted">Pins</span>
        {/* Keyed on the site so switching site swaps the blueprint and clears
            pins placed against the old one, which would otherwise be silently
            wrong coordinates. */}
        <MultiPinPlacer key={siteId} src={site?.blueprintUrl ?? null} />
      </div>

      <ContributorField
        contributors={contributors}
        defaultValue={creditedName ?? submitterName}
        label={`Credit this to (they submitted as “${submitterName}”)`}
      />

      <button
        type="submit"
        className="w-full rounded-btn bg-ink px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue"
      >
        Publish setup &amp; close submission
      </button>
    </form>
  );
}
