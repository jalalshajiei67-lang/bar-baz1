"use client";

import { useEffect, useRef, useState } from "react";

import { TEHRAN_BOUNDS } from "@/lib/tehran";
import { input } from "@/lib/ui";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type Result = { lat: number; lng: number; label: string };

/** Free-text address search backed by OpenStreetMap's Nominatim geocoder. */
export function LocationSearch({
  onSelect,
}: {
  onSelect: (lat: number, lng: number, label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Selecting a result rewrites `query` to the full label; skip the search
  // that change would otherwise trigger so the dropdown doesn't reopen.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const term = query.trim();

    const timer = setTimeout(async () => {
      if (term.length < 3) {
        setResults([]);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("q", term);
        url.searchParams.set("limit", "5");
        url.searchParams.set("accept-language", "fa");
        url.searchParams.set("countrycodes", "ir");
        // Restrict results to Tehran city, matching the map's locked bounds.
        url.searchParams.set(
          "viewbox",
          `${TEHRAN_BOUNDS.west},${TEHRAN_BOUNDS.north},${TEHRAN_BOUNDS.east},${TEHRAN_BOUNDS.south}`,
        );
        url.searchParams.set("bounded", "1");

        const res = await fetch(url, { signal: controller.signal });
        const data: NominatimResult[] = await res.json();
        setResults(
          data.map((item) => ({
            lat: Number(item.lat),
            lng: Number(item.lon),
            label: item.display_name,
          })),
        );
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        className={input}
        placeholder="جستجوی آدرس روی نقشه…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      />
      {loading ? (
        <span className="absolute inset-y-0 left-3 flex items-center text-xs opacity-50">
          …
        </span>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-black/15 bg-white text-sm shadow-lg dark:border-white/20 dark:bg-neutral-900">
          {results.map((result, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-start hover:bg-black/5 dark:hover:bg-white/10"
                // onMouseDown fires before the input's onBlur, so the click
                // registers before the dropdown closes.
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(result.lat, result.lng, result.label);
                  skipNextSearch.current = true;
                  setQuery(result.label);
                  setResults([]);
                  setOpen(false);
                }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
