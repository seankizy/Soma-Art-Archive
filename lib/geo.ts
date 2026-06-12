import exifr from "exifr";

export type Geo = { latitude: number; longitude: number };

// Read when the photo was taken (EXIF DateTimeOriginal), as epoch ms.
export async function captureTime(file: File): Promise<number | null> {
  try {
    const out = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const d = out?.DateTimeOriginal ?? out?.CreateDate;
    if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
  } catch {
    /* no exif */
  }
  return null;
}

// 1. Try to read GPS straight from the photo's EXIF — fully automatic for phone shots.
export async function gpsFromImage(file: File): Promise<Geo | null> {
  try {
    const out = await exifr.gps(file);
    if (out && typeof out.latitude === "number" && typeof out.longitude === "number") {
      return { latitude: out.latitude, longitude: out.longitude };
    }
  } catch {
    /* no exif / unsupported */
  }
  return null;
}

// 2. Fallback: ask the browser for the device's current position.
export function gpsFromDevice(): Promise<Geo | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// Optional: turn coordinates into a human place name via OpenStreetMap Nominatim.
// Free, no key. Be gentle with it (it's rate-limited); fine for occasional lookups.
export async function placeName(g: Geo): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${g.latitude}&lon=${g.longitude}&zoom=14`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.museum || a.gallery || a.tourism || a.amenity,
      a.city || a.town || a.village,
      a.country,
    ].filter(Boolean);
    return parts.join(", ") || data.display_name || null;
  } catch {
    return null;
  }
}
