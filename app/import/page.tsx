"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, BUCKET } from "@/lib/supabase";
import { compressImage, fileToBase64 } from "@/lib/compress";
import { gpsFromImage, captureTime, placeName, type Geo } from "@/lib/geo";
import { clusterCaptures, PRESETS, type GroupPreset } from "@/lib/cluster";
import { fetchCollections } from "@/lib/data";
import type { Collection } from "@/lib/types";

type Shot = {
  id: string;
  file: File;
  url: string;
  type: "artwork" | "card" | "other" | "?";
  time: number | null;
  lat: number | null;
  lng: number | null;
};

// One proposed work: one or more artwork photos (same object) + an optional card.
type Group = {
  artworkIds: string[];
  cardId: string | null;
  coverIndex: number; // index into artworkIds for the cover photo
  title: string; artist: string; year: string; medium: string; dimensions: string;
  tags: string; location: string; collection_id: string;
  geo: Geo | null;
};

export default function ImportPage() {
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [phase, setPhase] = useState<"pick" | "review">("pick");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [preset, setPreset] = useState<GroupPreset>("normal");
  // raw AI result kept so changing the grouping slider re-clusters without another call
  const [idResult, setIdResult] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => { fetchCollections().then(setCollections); }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next: Shot[] = await Promise.all(files.map(async (f) => {
      const [g, t] = await Promise.all([gpsFromImage(f), captureTime(f)]);
      return {
        id: crypto.randomUUID().slice(0, 8), file: f, url: URL.createObjectURL(f),
        type: "?" as const, time: t, lat: g?.latitude ?? null, lng: g?.longitude ?? null,
      };
    }));
    setShots(next);
  }

  async function identify() {
    setBusy(true);
    setStatus("Reading labels and matching…");
    const payload = await Promise.all(shots.map(async (s) => {
      const small = await compressImage(s.file);
      const { mediaType, data } = await fileToBase64(small);
      return { id: s.id, mediaType, data };
    }));
    const res = await fetch("/api/identify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: payload }),
    });
    const out = await res.json();
    if (out.error) { setBusy(false); setStatus("Identify failed: " + out.error); return; }

    const typed = shots.map((s) => {
      const it = out.items?.find((i: any) => i.id === s.id);
      return { ...s, type: (it?.type ?? "artwork") as Shot["type"] };
    });
    setShots(typed);
    setIdResult(out);
    await buildGroups(typed, out, preset);
    setPhase("review");
    setBusy(false);
    setStatus("");
  }

  // Build proposed works by clustering artwork photos, then attaching cards + metadata.
  async function buildGroups(typed: Shot[], out: any, p: GroupPreset) {
    const artworks = typed.filter((s) => s.type === "artwork");
    const clusters = clusterCaptures(
      artworks.map((s) => ({ id: s.id, time: s.time, lat: s.lat, lng: s.lng })), p
    );

    const cardData: Record<string, any> = Object.fromEntries(
      (out.items ?? []).filter((i: any) => i.type === "card").map((i: any) => [i.id, i.card ?? {}])
    );
    // best card per artwork id, from AI pairs
    const cardForArtwork: Record<string, { cardId: string; confidence: number }> = {};
    (out.pairs ?? []).forEach((pr: any) => {
      const cur = cardForArtwork[pr.artworkId];
      if (!cur || pr.confidence > cur.confidence) cardForArtwork[pr.artworkId] = { cardId: pr.cardId, confidence: pr.confidence };
    });

    const usedCards = new Set<string>();
    // Geocoding (Nominatim) is limited to ~1 req/sec, so resolve clusters
    // sequentially with a small gap and cache by rounded coordinate.
    const placeCache = new Map<string, string>();
    const newGroups: Group[] = [];
    for (const ids of clusters) {
      let cardId: string | null = null;
      for (const aid of ids) {
        const c = cardForArtwork[aid];
        if (c) { cardId = c.cardId; break; }
      }
      if (cardId) usedCards.add(cardId);
      const card = cardId ? cardData[cardId] : null;

      const firstWithGeo = ids.map((id) => typed.find((s) => s.id === id)!).find((s) => s.lat != null);
      const geo: Geo | null = firstWithGeo ? { latitude: firstWithGeo.lat!, longitude: firstWithGeo.lng! } : null;
      let location = "";
      if (geo) {
        const key = `${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
        if (placeCache.has(key)) {
          location = placeCache.get(key)!;
        } else {
          location = (await placeName(geo)) ?? "";
          placeCache.set(key, location);
          await new Promise((r) => setTimeout(r, 1100)); // stay under the rate limit
        }
      }

      newGroups.push({
        artworkIds: ids, cardId,
        coverIndex: 0,
        title: card?.title || "", artist: card?.artist || "", year: card?.year || "",
        medium: card?.medium || "", dimensions: card?.dimensions || "",
        tags: "", location, collection_id: "", geo,
      });
    }

    // cards that matched nothing → standalone groups
    typed.filter((s) => s.type === "card" && !usedCards.has(s.id)).forEach((c) => {
      const card = cardData[c.id] ?? {};
      newGroups.push({
        artworkIds: [], cardId: c.id,
        coverIndex: 0,
        title: card.title || "", artist: card.artist || "", year: card.year || "",
        medium: card.medium || "", dimensions: card.dimensions || "",
        tags: "", location: "", collection_id: "", geo: null,
      });
    });

    setGroups(newGroups);
  }

  // re-cluster when the slider changes (reuses stored AI result, no new API call)
  function changePreset(p: GroupPreset) {
    setPreset(p);
    if (idResult) buildGroups(shots, idResult, p);
  }

  function editGroup(i: number, k: keyof Group, v: string | number) {
    setGroups((g) => g.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  }
  // split a multi-photo group into one work per photo
  function splitGroup(i: number) {
    setGroups((g) => {
      const grp = g[i];
      if (grp.artworkIds.length <= 1) return g;
      const singles: Group[] = grp.artworkIds.map((id, n) => ({
        ...grp, artworkIds: [id], cardId: n === 0 ? grp.cardId : null,
      }));
      return [...g.slice(0, i), ...singles, ...g.slice(i + 1)];
    });
  }

  async function uploadShot(id: string | null): Promise<string | null> {
    if (!id) return null;
    const shot = shots.find((s) => s.id === id);
    if (!shot) return null;
    const compressed = await compressImage(shot.file);
    const path = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, { contentType: compressed.type });
    return error ? null : path;
  }

  async function createAll() {
    setBusy(true);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      setStatus(`Saving ${i + 1} of ${groups.length}…`);
      const artPaths = (await Promise.all(g.artworkIds.map(uploadShot))).filter(Boolean) as string[];
      const cardPath = await uploadShot(g.cardId);
      const images = [...artPaths, cardPath].filter(Boolean) as string[];
      const coverPath = artPaths[g.coverIndex] ?? artPaths[0] ?? cardPath;
      await supabase.from("artworks").insert({
        title: g.title || "Untitled",
        artist: g.artist || null, year: g.year || null, medium: g.medium || null,
        dimensions: g.dimensions || null, location: g.location || null,
        latitude: g.geo?.latitude ?? null, longitude: g.geo?.longitude ?? null,
        tags: g.tags.split(",").map((t) => t.trim()).filter(Boolean),
        collection_id: g.collection_id || null,
        image_path: coverPath, card_image_path: cardPath, images,
      });
    }
    setBusy(false);
    router.push("/");
  }

  const grouped = useMemo(() => groups.filter((g) => g.artworkIds.length > 1).length, [groups]);
  const field = "w-full bg-transparent border-b hairline pb-1 text-sm focus:outline-none focus:border-rust";

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <a href="/" className="label hover:text-rust">← archive</a>
      <h1 className="font-display text-4xl mt-3 mb-2">Batch import</h1>
      <p className="text-sm text-faded mb-8 max-w-xl">
        Add a mix of artwork photos and name cards. Claude reads each label and pairs it with its
        artwork, and photos taken together (same object from several angles, or a building and its
        details) are grouped into one work. You review everything before it saves.
      </p>

      {phase === "pick" && (
        <>
          <label className="block cursor-pointer border hairline border-dashed rounded-sm p-10 text-center bg-parchmentDk/30 hover:bg-parchmentDk/60 transition">
            <span className="text-faded">tap to choose photos — artworks, details, and name cards together</span>
            <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
          </label>
          {shots.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-6">
                {shots.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.id} src={s.url} alt="" className="aspect-square object-cover rounded-sm border hairline" />
                ))}
              </div>
              <button onClick={identify} disabled={busy}
                className="mt-6 bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
                {busy ? status || "Working…" : `Identify ${shots.length} photos with AI`}
              </button>
            </>
          )}
        </>
      )}

      {phase === "review" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="label">{groups.length} works proposed · {grouped} grouped from multiple photos</div>
            <label className="text-sm flex items-center gap-2">
              <span className="label">grouping</span>
              <select value={preset} onChange={(e) => changePreset(e.target.value as GroupPreset)}
                className="bg-transparent border hairline rounded-sm px-2 py-1">
                {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>

          <div className="space-y-5">
            {groups.map((g, i) => {
              const arts = g.artworkIds.map((id) => shots.find((s) => s.id === id)).filter(Boolean) as Shot[];
              const card = shots.find((s) => s.id === g.cardId);
              return (
                <div key={i} className="border hairline rounded-sm p-4">
                  <div className="flex gap-4">
                    <div className="flex gap-2 shrink-0 flex-wrap max-w-[230px]">
                      {arts.map((a, n) => (
                        <div
                          key={a.id}
                          className="relative cursor-pointer group"
                          onClick={() => editGroup(i, "coverIndex", n as any)}
                          title={n === g.coverIndex ? "Cover photo" : "Tap to set as cover"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt="" className={`w-20 h-20 object-cover rounded-sm transition ${n === g.coverIndex ? "ring-2 ring-rust" : "opacity-70 hover:opacity-100"}`} />
                          {n === g.coverIndex && (
                            <span className="absolute top-1 left-1 label bg-rust text-parchment px-1 rounded-sm">cover</span>
                          )}
                          {/* delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroups((gs) => gs.map((x, idx) => {
                                if (idx !== i) return x;
                                const newIds = x.artworkIds.filter((id) => id !== a.id);
                                const newCover = Math.min(x.coverIndex, Math.max(0, newIds.length - 1));
                                return { ...x, artworkIds: newIds, coverIndex: newCover };
                              }));
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 text-parchment text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rust"
                            title="Remove this photo"
                          >×</button>
                        </div>
                      ))}
                      {card && (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={card.url} alt="" className="w-20 h-20 object-cover rounded-sm opacity-90" />
                          <span className="absolute bottom-1 left-1 label bg-rust/90 text-parchment px-1 rounded-sm">card</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="col-span-2"><span className="label">title</span>
                        <input className={field} value={g.title} onChange={(e) => editGroup(i, "title", e.target.value)} /></div>
                      <div><span className="label">artist</span>
                        <input className={field} value={g.artist} onChange={(e) => editGroup(i, "artist", e.target.value)} /></div>
                      <div><span className="label">year</span>
                        <input className={field} value={g.year} onChange={(e) => editGroup(i, "year", e.target.value)} /></div>
                      <div><span className="label">medium</span>
                        <input className={field} value={g.medium} onChange={(e) => editGroup(i, "medium", e.target.value)} /></div>
                      <div><span className="label">tags</span>
                        <input className={field} value={g.tags} onChange={(e) => editGroup(i, "tags", e.target.value)} placeholder="comma, separated" /></div>
                    </div>
                  </div>
                  {g.artworkIds.length > 1 && (
                    <button onClick={() => splitGroup(i)} className="text-xs text-rust mt-3">
                      ✦ {g.artworkIds.length} photos grouped — split into separate works
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={createAll} disabled={busy}
              className="bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
              {busy ? status || "Saving…" : `Create ${groups.length} works`}
            </button>
            <button onClick={() => setPhase("pick")} className="text-sm text-faded hover:text-rust">back</button>
          </div>
        </>
      )}
    </main>
  );
}
