/** Azadi Tower — a sane default centre for Tehran. */
export const TEHRAN_CENTER: [number, number] = [35.6997, 51.3381];

/** Bounding box that keeps the map (and address search) locked to Tehran city. */
export const TEHRAN_BOUNDS = {
  south: 35.55,
  west: 51.05,
  north: 35.85,
  east: 51.6,
} as const;
