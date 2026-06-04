"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  createManageImageUploadUrl,
  updateCreatorByTokenAction,
  type ManageUpdateResult,
} from "@/app/manage/[token]/actions";
import { compressImageForUpload, putToR2 } from "@/lib/upload";

// Mirrors the dropdown choices in components/ClaimForm.tsx — keep these
// lists in sync with lib/creator-validation.ts's allow-lists. Anything
// outside the allow-list is silently dropped server-side.
const RANK_OPTIONS = [
  "Copper",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Champion",
];
const REGION_OPTIONS = ["NA", "EU", "LATAM", "APAC", "Oceania", "MENA"];
const PLATFORM_OPTIONS = ["PC", "PlayStation", "Xbox"];

type InitialProfile = {
  display_name: string | null;
  tiktok: string | null;
  bio: string | null;
  profile_image_url: string | null;
  rank: string | null;
  region: string | null;
  platform: string | null;
  youtube_url: string | null;
  twitch_url: string | null;
  x_url: string | null;
};

type Status = "idle" | "submitting" | "saved";

export function CreatorManageForm({
  token,
  initial,
}: {
  token: string;
  initial: InitialProfile;
}) {
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [tiktok, setTiktok] = useState(initial.tiktok ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [rank, setRank] = useState(initial.rank ?? "");
  const [region, setRegion] = useState(initial.region ?? "");
  const [platform, setPlatform] = useState(initial.platform ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? "");
  const [twitchUrl, setTwitchUrl] = useState(initial.twitch_url ?? "");
  const [xUrl, setXUrl] = useState(initial.x_url ?? "");

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(
    initial.profile_image_url
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleProfileImage(file: File) {
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const compressed = await compressImageForUpload(file, "peek");
      const presign = await createManageImageUploadUrl(
        token,
        compressed.name,
        compressed.type
      );
      if (!presign.ok) {
        setUploadError(presign.error);
        return;
      }
      await putToR2(presign.uploadUrl, compressed, compressed.type, (pct) =>
        setUploadProgress(pct)
      );
      setProfileImageUrl(presign.publicUrl);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !tiktok.trim()) {
      setError("Display name and TikTok handle are required.");
      return;
    }
    setStatus("submitting");
    startTransition(async () => {
      const res: ManageUpdateResult = await updateCreatorByTokenAction({
        token,
        display_name: displayName,
        tiktok,
        bio,
        profile_image_url: profileImageUrl,
        rank: rank || null,
        region: region || null,
        platform: platform || null,
        youtube_url: youtubeUrl || null,
        twitch_url: twitchUrl || null,
        x_url: xUrl || null,
      });
      if (res.ok) {
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("idle");
        setError(res.error);
      }
    });
  }

  const inputCls =
    "w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";
  const labelCls = "block text-xs text-muted";
  const cardCls =
    "space-y-5 rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]";
  const submitting = pending || status === "submitting";

  return (
    <form onSubmit={handleSubmit} className={cardCls}>
      <div>
        <span className={labelCls}>Profile picture</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-bg">
            {profileImageUrl ? (
              <Image
                key={profileImageUrl}
                src={profileImageUrl}
                alt="Profile preview"
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-8 w-8 fill-none stroke-current"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="sr-only"
              disabled={uploading || submitting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProfileImage(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || submitting}
                className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileImageUrl ? "Replace" : "Choose image"}
              </button>
              {profileImageUrl && !uploading && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileImageUrl(null);
                    setUploadError(null);
                  }}
                  disabled={submitting}
                  className="rounded-btn border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </div>
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-brand transition-[width] duration-150 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Uploading… {uploadProgress}%
                </p>
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-[11px] text-red-600" role="alert">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </div>

      <label className={labelCls}>
        <span className="mb-1 block">Display name *</span>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">TikTok handle *</span>
        <input
          type="text"
          required
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
          maxLength={32}
          placeholder="@yourhandle (the @ is optional)"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        <span className="mb-1 block">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          className={`${inputCls} resize-y`}
        />
        <span className="mt-1 block text-[11px] text-muted">
          Up to 500 characters.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={labelCls}>
          <span className="mb-1 block">Rank</span>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {RANK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {REGION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">Platform</span>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Other links (optional)
        </p>
        <label className={labelCls}>
          <span className="mb-1 block">YouTube</span>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            maxLength={200}
            placeholder="https://youtube.com/@yourchannel"
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">Twitch</span>
          <input
            type="url"
            value={twitchUrl}
            onChange={(e) => setTwitchUrl(e.target.value)}
            maxLength={200}
            placeholder="https://twitch.tv/yourchannel"
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          <span className="mb-1 block">X (Twitter)</span>
          <input
            type="url"
            value={xUrl}
            onChange={(e) => setXUrl(e.target.value)}
            maxLength={200}
            placeholder="https://x.com/yourhandle"
            className={inputCls}
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">* required</p>
        <div className="flex items-center gap-3">
          {status === "saved" && (
            <span className="text-xs font-medium text-emerald-700">
              Saved ✓
            </span>
          )}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : uploading
                ? "Uploading…"
                : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
