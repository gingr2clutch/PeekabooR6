"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { supabasePublic } from "@/lib/supabase";

type SearchIndex = {
  maps: { name: string; slug: string }[];
  floors: { name: string; slug: string; mapName: string; mapSlug: string }[];
  peeks: {
    name: string;
    slug: string;
    floorName: string;
    mapName: string;
    mapSlug: string;
  }[];
};

// Client-side load of the search index (published maps + published peeks with
// floor/map context, floors derived from the peeks on them). Fetched via the
// public anon client so the header stays static on every page — no server-side
// per-page query. Cached at module scope so both header instances (desktop +
// mobile) share one request and it survives client navigation.
let indexPromise: Promise<SearchIndex> | null = null;

function loadSearchIndex(): Promise<SearchIndex> {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    type Row = {
      slug: string;
      name: string;
      floors: {
        slug: string;
        name: string;
        maps: { slug: string; name: string; published: boolean } | null;
      } | null;
    };
    const sb = supabasePublic();
    const [mapsRes, peekRes] = await Promise.all([
      sb.from("maps").select("slug, name").eq("published", true).order("name", { ascending: true }),
      sb
        .from("peeks")
        .select("slug, name, floors(slug, name, maps(slug, name, published))")
        .eq("published", true),
    ]);
    if (mapsRes.error) throw mapsRes.error;
    if (peekRes.error) throw peekRes.error;

    const peeks: SearchIndex["peeks"] = [];
    const floors: SearchIndex["floors"] = [];
    const seen = new Set<string>();
    for (const row of (peekRes.data ?? []) as unknown as Row[]) {
      const floor = row.floors;
      const map = floor?.maps;
      if (!floor || !map || !map.published) continue;
      peeks.push({
        name: row.name,
        slug: row.slug,
        floorName: floor.name,
        mapName: map.name,
        mapSlug: map.slug,
      });
      const key = `${map.slug}/${floor.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        floors.push({ name: floor.name, slug: floor.slug, mapName: map.name, mapSlug: map.slug });
      }
    }
    const maps = ((mapsRes.data ?? []) as { slug: string; name: string }[]).map((m) => ({
      name: m.name,
      slug: m.slug,
    }));
    return { maps, floors, peeks };
  })().catch((e) => {
    // Let a failed load retry on the next mount rather than caching the error.
    indexPromise = null;
    throw e;
  });
  return indexPromise;
}

type Kind = "map" | "floor" | "peek";
type ResultItem = { kind: Kind; name: string; breadcrumb: string | null; href: string };

const CAP = 8;
const MIN_CHARS = 2;

// Case-insensitive substring match on each entity's own name. Fills up to CAP
// with peeks first, then maps, then floors; displayed MAPS → FLOORS → PEEKS.
function buildResults(index: SearchIndex | null, raw: string) {
  const empty = { maps: [], floors: [], peeks: [], flat: [] } as {
    maps: ResultItem[];
    floors: ResultItem[];
    peeks: ResultItem[];
    flat: ResultItem[];
  };
  const q = raw.trim().toLowerCase();
  if (!index || q.length < MIN_CHARS) return empty;

  const peekAll: ResultItem[] = index.peeks
    .filter((p) => p.name.toLowerCase().includes(q))
    .map((p) => ({
      kind: "peek",
      name: p.name,
      breadcrumb: `${p.mapName} › ${p.floorName}`,
      href: `/peeks/${p.slug}`,
    }));
  const mapAll: ResultItem[] = index.maps
    .filter((m) => m.name.toLowerCase().includes(q))
    .map((m) => ({ kind: "map", name: m.name, breadcrumb: null, href: `/maps/${m.slug}` }));
  const floorAll: ResultItem[] = index.floors
    .filter((f) => f.name.toLowerCase().includes(q))
    .map((f) => ({
      kind: "floor",
      name: f.name,
      breadcrumb: f.mapName,
      href: `/maps/${f.mapSlug}/${f.slug}`,
    }));

  let room = CAP;
  const peeks = peekAll.slice(0, room);
  room -= peeks.length;
  const maps = mapAll.slice(0, Math.max(0, room));
  room -= maps.length;
  const floors = floorAll.slice(0, Math.max(0, room));
  const flat = [...maps, ...floors, ...peeks]; // display + keyboard order
  return { maps, floors, peeks, flat };
}

export function SiteSearch({ className }: { className?: string }) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-listbox`;
  const optId = (i: number) => `${uid}-opt-${i}`;

  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the index once on mount (shared, module-cached promise).
  useEffect(() => {
    let alive = true;
    loadSearchIndex()
      .then((idx) => {
        if (alive) setIndex(idx);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const { maps, floors, peeks, flat } = useMemo(
    () => buildResults(index, query),
    [index, query]
  );
  const showDropdown = open && query.trim().length >= MIN_CHARS;

  useEffect(() => setActive(-1), [query]);

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(item: ResultItem) {
    setQuery("");
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown) {
      if (e.key === "ArrowDown" && query.trim().length >= MIN_CHARS) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (flat.length === 0 ? -1 : (a + 1) % flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length === 0 ? -1 : a <= 0 ? flat.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      if (active >= 0 && flat[active]) {
        e.preventDefault();
        select(flat[active]);
      }
    }
  }

  const renderGroup = (label: string, items: ResultItem[], offset: number) =>
    items.length === 0 ? null : (
      <li role="presentation" key={label}>
        <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </div>
        <ul role="group" aria-label={label} className="px-1">
          {items.map((item, k) => {
            const i = offset + k;
            const isActive = i === active;
            return (
              <li
                key={item.href}
                id={optId(i)}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(item);
                }}
                className={`cursor-pointer rounded-btn px-2.5 py-2 ${
                  isActive ? "bg-brand/[0.08]" : ""
                }`}
              >
                <div className="truncate text-sm font-medium text-ink">{item.name}</div>
                {item.breadcrumb && (
                  <div className="truncate text-xs text-muted">{item.breadcrumb}</div>
                )}
              </li>
            );
          })}
        </ul>
      </li>
    );

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative flex items-center">
        <Search
          size={18}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-3 text-muted"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-activedescendant={showDropdown && active >= 0 ? optId(active) : undefined}
          aria-autocomplete="list"
          aria-label="Search maps, floors, and peeks"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search maps, floors, peeks"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-card border border-border bg-card pl-10 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-card border border-border bg-card py-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        >
          {index === null ? (
            <li role="presentation" className="px-3 py-3 text-sm text-muted">
              Searching…
            </li>
          ) : flat.length === 0 ? (
            <li role="presentation" className="px-3 py-3 text-sm text-muted">
              No results for “{query.trim()}”
            </li>
          ) : (
            <>
              {renderGroup("Maps", maps, 0)}
              {renderGroup("Floors", floors, maps.length)}
              {renderGroup("Peeks", peeks, maps.length + floors.length)}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
