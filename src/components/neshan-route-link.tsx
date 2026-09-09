"use client";

import { useState } from "react";

const routingBase = "https://neshan.org/maps/routing/car";

const coords = (lat: number, lng: number) =>
  `${lat.toFixed(6)},${lng.toFixed(6)}`;

/** Neshan only draws a route when the URL says where you are starting from, so
 *  the browser's location goes into the link. Without it Neshan opens with an
 *  empty origin box and waits, which looks like the link did nothing. */
export function NeshanRouteLink({
  lat,
  lng,
  className,
  children,
}: {
  lat: number;
  lng: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "failed">("idle");
  const destination = `${routingBase}/destination/${coords(lat, lng)}`;

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <a
        className={className}
        href={destination}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          // After a failure the plain link opens Neshan, origin left to the user.
          if (status !== "idle" || !navigator.geolocation) return;
          event.preventDefault();
          setStatus("locating");

          const go = (url: string) => {
            window.location.href = url;
          };

          navigator.geolocation.getCurrentPosition(
            ({ coords: here }) =>
              go(
                `${routingBase}/origin/${coords(here.latitude, here.longitude)}/destination/${coords(lat, lng)}`,
              ),
            () => setStatus("failed"),
            { timeout: 10_000, maximumAge: 60_000 },
          );
        }}
      >
        {status === "locating" ? "در حال یافتن موقعیت…" : children}
      </a>
      {status === "failed" ? (
        <span className="text-xs opacity-60">
          موقعیت شما در دسترس نیست — دوباره بزنید تا نشان بدون مبدأ باز شود
        </span>
      ) : null}
    </span>
  );
}
