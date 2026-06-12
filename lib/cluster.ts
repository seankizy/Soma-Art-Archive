// Groups photos that were taken close together in time and space — the signal
// that they're the same object/building shot from several angles. Greedy pass over
// time-sorted shots: a shot joins the current group if it's within BOTH the time and
// distance thresholds of the previous shot; otherwise it starts a new group.

export type Capture = { id: string; time: number | null; lat: number | null; lng: number | null };

export type GroupPreset = "tight" | "normal" | "loose" | "off";
export const PRESETS: Record<GroupPreset, { maxSeconds: number; maxMeters: number; label: string }> = {
  tight:  { maxSeconds: 30,  maxMeters: 15,  label: "Tight (30s · 15m)" },
  normal: { maxSeconds: 120, maxMeters: 40,  label: "Normal (2m · 40m)" },
  loose:  { maxSeconds: 600, maxMeters: 120, label: "Loose (10m · 120m)" },
  off:    { maxSeconds: 0,   maxMeters: 0,   label: "Off (one work each)" },
};

function metersBetween(a: Capture, b: Capture): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function clusterCaptures(items: Capture[], preset: GroupPreset): string[][] {
  if (preset === "off" || items.length <= 1) return items.map((i) => [i.id]);
  const { maxSeconds, maxMeters } = PRESETS[preset];

  // Shots with timestamps sort by time; those without keep original order at the end.
  const timed = items.filter((i) => i.time != null).sort((a, b) => a.time! - b.time!);
  const untimed = items.filter((i) => i.time == null);

  const groups: Capture[][] = [];
  let current: Capture[] = [];
  for (const shot of timed) {
    if (current.length === 0) { current = [shot]; continue; }
    const prev = current[current.length - 1];
    const dt = Math.abs((shot.time! - prev.time!) / 1000);
    const dm = metersBetween(prev, shot);
    // distance only constrains when both shots actually have GPS
    const closeEnough = dt <= maxSeconds && (dm === Infinity ? true : dm <= maxMeters);
    if (closeEnough) current.push(shot);
    else { groups.push(current); current = [shot]; }
  }
  if (current.length) groups.push(current);

  // each untimed shot becomes its own group (can't be clustered confidently)
  untimed.forEach((u) => groups.push([u]));

  return groups.map((g) => g.map((s) => s.id));
}
