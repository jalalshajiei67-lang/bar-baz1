/**
 * Best-effort deep link into Neshan (an Iranian maps/navigation app) for a point.
 * Neshan doesn't publish a documented key-free deep-link format; this mirrors
 * the Google-Maps-style "@lat,lng,zoomz" convention their web map is known to
 * follow. On Android with the Neshan app installed, neshan.org links open the
 * app directly (their app-link config claims the whole domain); otherwise it
 * opens their web map in a new tab.
 */
export function neshanUrl(lat: number, lng: number): string {
  return `https://neshan.org/maps/@${lat},${lng},17z`;
}
