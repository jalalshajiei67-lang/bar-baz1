"use client";

import { useState } from "react";

const routingBase = "https://neshan.org/maps/routing/car";
const neshanPackage = "org.rajman.neshan.traffic.tehran.navigator";

const coords = (lat: number, lng: number) =>
  `${lat.toFixed(6)},${lng.toFixed(6)}`;

/** Neshan only draws a route when it knows where you are starting from. On
 *  Android the link is handed to the Neshan app, which uses the phone's GPS;
 *  elsewhere we read the browser's location and put it in the URL, since the
 *  web map otherwise opens with an empty origin and waits for one. */
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
  const [locating, setLocating] = useState(false);
  const destination = `${routingBase}/destination/${coords(lat, lng)}`;

  return (
    <a
      className={className}
      href={destination}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        if (locating) return;

        // Android hands the link to the Neshan app only on the click itself, so
        // this stays synchronous — any await in between breaks the hand-off.
        if (/android/i.test(navigator.userAgent)) {
          event.preventDefault();
          window.location.href = `intent://neshan.org/maps/routing/car/destination/${coords(lat, lng)}#Intent;scheme=https;package=${neshanPackage};S.browser_fallback_url=${encodeURIComponent(destination)};end`;
          return;
        }

        if (!navigator.geolocation) return;
        event.preventDefault();
        setLocating(true);

        const go = (url: string) => {
          window.location.href = url;
        };

        navigator.geolocation.getCurrentPosition(
          ({ coords: here }) =>
            go(
              `${routingBase}/origin/${coords(here.latitude, here.longitude)}/destination/${coords(lat, lng)}`,
            ),
          () => go(destination),
          { timeout: 10_000, maximumAge: 60_000 },
        );
      }}
    >
      {locating ? "در حال یافتن موقعیت…" : children}
    </a>
  );
}
