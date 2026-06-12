"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import ArtworkCard from "@/components/ArtworkCard";
import { fetchArtworks, fetchCollections, allTags, updateSortOrder } from "@/lib/data";
import { exportVisualPdf } from "@/lib/export";
import type { Artwork, Collection } from "@/lib/types";

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [reorder, setReorder] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const [a, c, t] = await Promise.all([
      fetchArtworks({ search, collectionId: activeCollection, tag: activeTag }),
      fetchCollections(),
      allTags(),
    ]);
    setArtworks(a);
    setCollections(c);
    setTags(t);
    setLoading(false);
  }, [search, activeCollection, activeTag]);

  useEffect(() => {
    const id = setTimeout(load, 250); // debounce search
    return () => clearTimeout(id);
  }, [load]);

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = artworks.findIndex((a) => a.id === active.id);
    const newIdx = artworks.findIndex((a) => a.id === over.id);
    const next = arrayMove(artworks, oldIdx, newIdx);
    setArtworks(next);
    await updateSortOrder(next.map((a, i) => ({ id: a.id, sort_order: i })));
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10">
      {/* Masthead */}
      <header className="border-b hairline pb-6 mb-8">
        <div className="label mb-1">a lifetime archive</div>
        <h1 className="font-display text-5xl leading-none">Soma Archive</h1>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, artist, medium, notes…  (try: stone -bronze)"
          className="w-full bg-transparent border-b hairline pb-2 font-display text-2xl placeholder:text-faded/60 focus:outline-none focus:border-rust transition"
        />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={() => setActiveCollection(null)}
            className={`px-3 py-1 rounded-sm border hairline transition ${!activeCollection ? "bg-ink text-parchment" : "hover:bg-parchmentDk"}`}
          >
            All
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id === activeCollection ? null : c.id)}
              className={`px-3 py-1 rounded-sm border hairline transition ${activeCollection === c.id ? "bg-ink text-parchment" : "hover:bg-parchmentDk"}`}
            >
              {c.name}
            </button>
          ))}
          <span className="mx-2 text-faded">·</span>
          <button
            onClick={() => setReorder((r) => !r)}
            className={`px-3 py-1 rounded-sm border hairline transition ${reorder ? "bg-rust text-parchment" : "hover:bg-parchmentDk"}`}
          >
            {reorder ? "Done reordering" : "Reorder"}
          </button>
          <button
            onClick={() => exportVisualPdf(artworks, activeCollection
              ? collections.find((c) => c.id === activeCollection)?.name ?? "Soma Archive"
              : "Soma Archive")}
            className="px-3 py-1 rounded-sm border hairline hover:bg-parchmentDk transition"
          >
            Export PDF
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t === activeTag ? null : t)}
                className={`label px-2 py-0.5 rounded-sm transition ${activeTag === t ? "bg-sage text-parchment" : "bg-parchmentDk hover:bg-parchmentDk/70"}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="label py-20 text-center">loading…</div>
      ) : artworks.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="font-display text-3xl text-faded">Nothing here yet.</div>
          <Link href="/add" className="text-rust underline">Add the first work →</Link>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={artworks.map((a) => a.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {artworks.map((art) => (
                <div key={art.id} className="fade-up">
                  <ArtworkCard art={art} draggable={reorder} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </main>
  );
}
