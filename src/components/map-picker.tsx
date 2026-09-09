"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

/** Azadi Tower — a sane default centre for Tehran. */
export const TEHRAN: [number, number] = [35.6997, 51.3381];

// Leaflet's default marker images break under bundlers, so draw the pin inline.
const pinIcon = L.divIcon({
  className: "",
  iconSize: [26, 36],
  iconAnchor: [13, 36],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 23 13 23s13-13.3 13-23c0-7.2-5.8-13-13-13z" fill="#059669"/>
    <circle cx="13" cy="13" r="5" fill="#fff"/>
  </svg>`,
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const hasPoint = lat !== null && lng !== null;
  const center: [number, number] = hasPoint ? [lat, lng] : TEHRAN;

  return (
    <MapContainer
      center={center}
      zoom={hasPoint ? 15 : 11}
      scrollWheelZoom
      className="relative z-0 h-72 w-full overflow-hidden rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onPick={onPick} />
      {hasPoint ? (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const { lat: newLat, lng: newLng } = (
                event.target as L.Marker
              ).getLatLng();
              onPick(newLat, newLng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
