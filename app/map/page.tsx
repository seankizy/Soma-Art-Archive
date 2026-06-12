"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchArtworks, fetchCollections, allTags } from "@/lib/data";
import { imageUrl } from "@/lib/supabase";
import type { Artwork, Collection } from "@/lib/types";

// Leaflet uses window — load the map only in the browser.
const ArchiveMap = dynamic(() => import("@/components/ArchiveMap"), {
  ssr: false,
  loading: () => <div className="label p-10">loading map…</div>,
});

export default function MapPage() {
  const router = useRouter();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, c, t] = await Promise.all([
      fetchArtworks({ search, collectionId: activeCollection, tag: activeTag }),
      fetchCollections(),
      allTags(),
    ]);
    setArtworks(a);
    setCollections(c);
    setTags(t);
  }, [search, activeCollection, activeTag]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const unplaced = artworks.filter((a) => a.latitude == null || a.longitude == null);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <header className="flex items-end justify-between border-b hairline pb-5 mb-5">
        <div>
          <div className="label mb-1">search by place</div>
          <h1 className="font-display text-4xl leading-none">Atlas</h1>
        </div>
        <a href="/" className="text-sm border hairline px-4 py-2 rounded-sm hover:bg-parchmentDk transition">
          ← Grid view
        </a>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter the map…"
          className="flex-1 min-w-[200px] bg-transparent border-b hairline pb-1.5 focus:outline-none focus:border-rust"
        />
        <button
          onClick={() => setActiveCollection(null)}
          className={`px-3 py-1 rounded-sm border hairline text-sm ${!activeCollection ? "bg-ink text-parchment" : "hover:bg-parchmentDk"}`}
        >
          All
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)}
            className={`px-3 py-1 rounded-sm border hairline text-sm ${activeCollection === c.id ? "bg-ink text-parchment" : "hover:bg-parchmentDk"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={`label px-2 py-0.5 rounded-full transition ${activeTag === t ? "bg-sage text-parchment" : "bg-parchmentDk hover:bg-parchmentDk/70"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="h-[60vh] border hairline rounded-sm overflow-hidden">
        <ArchiveMap artworks={artworks} onSelect={(a) => router.push(`/artwork/${a.id}`)} />
      </div>

      {unplaced.length > 0 && (
        <div className="mt-5">
          <div className="label mb-2">no location yet — {unplaced.length} works</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {unplaced.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/artwork/${a.id}`)}
                className="shrink-0 w-28 text-left"
              >
                <div className="w-28 h-28 bg-parchmentDk rounded-sm overflow-hidden border hairline">
                  {imageUrl(a.image_path) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(a.image_path)!} alt={a.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="text-xs mt-1 leading-tight line-clamp-2">{a.title}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
