"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { LocationSearch } from "@/components/location-search";
import { neshanUrl } from "@/lib/neshan";
import { btnGhost, label } from "@/lib/ui";

import type { FlyToTarget } from "./map-picker";

const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />
  ),
});

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Map picker plus the two hidden inputs the server action reads.
 * Click anywhere on the map, or drag the pin, to set the location.
 */
export function LocationField({
  initialLat,
  initialLng,
}: {
  initialLat: number | null;
  initialLng: number | null;
}) {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    initialLat !== null && initialLng !== null
      ? { lat: initialLat, lng: initialLng }
      : null,
  );
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null);
  const flySeq = useRef(0);

  return (
    <div>
      <span className={label}>موقعیت روی نقشه</span>

      <input type="hidden" name="lat" value={point ? point.lat : ""} />
      <input type="hidden" name="lng" value={point ? point.lng : ""} />

      <div className="mb-2">
        <LocationSearch
          onSelect={(lat, lng) => {
            const next = { lat: round(lat), lng: round(lng) };
            setPoint(next);
            flySeq.current += 1;
            setFlyTo({ ...next, seq: flySeq.current });
          }}
        />
      </div>

      <MapPicker
        lat={point?.lat ?? null}
        lng={point?.lng ?? null}
        onPick={(lat, lng) => setPoint({ lat: round(lat), lng: round(lng) })}
        flyTo={flyTo}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="opacity-60">
          {point
            ? `${point.lat.toFixed(6)} , ${point.lng.toFixed(6)}`
            : "روی نقشه بزنید یا آدرس را جستجو کنید تا محل مغازه مشخص شود"}
        </span>
        {point ? (
          <a
            href={neshanUrl(point.lat, point.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnGhost} px-2 py-1 text-xs`}
          >
            مسیریابی با نشان
          </a>
        ) : null}
        {point ? (
          <button
            type="button"
            className={`${btnGhost} px-2 py-1 text-xs`}
            onClick={() => setPoint(null)}
          >
            حذف موقعیت
          </button>
        ) : null}
      </div>
    </div>
  );
}
