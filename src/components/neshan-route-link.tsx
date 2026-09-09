"use client";

const routingBase = "https://neshan.org/maps/routing/car";

const coords = (lat: number, lng: number) =>
  `${lat.toFixed(6)},${lng.toFixed(6)}`;

/** Neshan only draws a route when the URL carries an origin — with just a
 *  destination it opens the routing panel and waits for one to be picked. */
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
  const destination = `${routingBase}/destination/${coords(lat, lng)}`;

  return (
    <a
      className={className}
      href={destination}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        if (!navigator.geolocation) return;
        event.preventDefault();

        // Opened inside the click so the popup blocker allows it; the location
        // is filled in once the browser hands us a position.
        const tab = window.open("", "_blank");
        if (tab) tab.opener = null;

        const go = (url: string) => {
          if (tab) tab.location.href = url;
          else window.open(url, "_blank", "noreferrer");
        };

        navigator.geolocation.getCurrentPosition(
          ({ coords: here }) =>
            go(
              `${routingBase}/origin/${coords(here.latitude, here.longitude)}/destination/${coords(lat, lng)}`,
            ),
          () => go(destination),
          { timeout: 8000, maximumAge: 60_000 },
        );
      }}
    >
      {children}
    </a>
  );
}
