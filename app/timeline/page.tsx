"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, imageUrl } from "@/lib/supabase";
import type { Artwork } from "@/lib/types";

// Pull a sortable year out of free-text like "c. 1610", "1972", "n.d.".
function parseYear(y: string | null): number | null {
  if (!y) return null;
  const m = y.match(/-?\d{3,4}/);
  return m ? parseInt(m[0], 10) : null;
}
function bucketLabel(year: number): string {
  if (year < 0) return "BCE";
  const c = Math.floor(year / 100) + 1;
  const suffix = c === 21 ? "21st" : c === 20 ? "20th" : c === 19 ? "19th" : c === 18 ? "18th" : c === 17 ? "17th" : c === 16 ? "16th" : `${c}th`;
  return `${suffix} century`;
}

export default function TimelinePage() {
  const [works, setWorks] = useState<Artwork[]>([]);

  useEffect(() => {
    supabase.from("artworks").select("*").then(({ data }) => setWorks((data ?? []) as Artwork[]));
  }, []);

  const dated = works
    .map((w) => ({ w, y: parseYear(w.year) }))
    .filter((x) => x.y != null)
    .sort((a, b) => a.y! - b.y!) as { w: Artwork; y: number }[];
  const undated = works.filter((w) => parseYear(w.year) == null);

  // group into century buckets
  const buckets: { label: string; items: { w: Artwork; y: number }[] }[] = [];
  dated.forEach((x) => {
    const label = bucketLabel(x.y);
    let b = buckets.find((bk) => bk.label === label);
    if (!b) { b = { label, items: [] }; buckets.push(b); }
    b.items.push(x);
  });

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <div className="flex items-end justify-between border-b hairline pb-5 mb-8">
        <div>
          <div className="label mb-1">across time</div>
          <h1 className="font-display text-4xl leading-none">Timeline</h1>
        </div>
        <a href="/" className="text-sm border hairline px-4 py-2 rounded-sm hover:bg-parchmentDk transition">← Grid</a>
      </div>

      <div className="relative border-l-2 hairline ml-3 pl-8 space-y-12">
        {buckets.map((b) => (
          <div key={b.label} className="relative">
            <div className="absolute -left-[42px] top-1 w-3 h-3 rounded-full bg-rust" />
            <div className="font-display text-2xl mb-4">{b.label}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {b.items.map(({ w, y }) => (
                <Link key={w.id} href={`/artwork/${w.id}`} className="card-hover block">
                  <div className="aspect-square bg-parchmentDk rounded-sm overflow-hidden border hairline">
                    {imageUrl(w.image_path) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(w.image_path)!} alt={w.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-sm font-display mt-1 leading-tight">{w.title}</div>
                  <div className="label">{w.year}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {undated.length > 0 && (
          <div className="relative">
            <div className="absolute -left-[42px] top-1 w-3 h-3 rounded-full bg-faded" />
            <div className="font-display text-2xl mb-4 text-faded">Undated</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {undated.map((w) => (
                <Link key={w.id} href={`/artwork/${w.id}`} className="card-hover block">
                  <div className="aspect-square bg-parchmentDk rounded-sm overflow-hidden border hairline">
                    {imageUrl(w.image_path) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(w.image_path)!} alt={w.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-sm font-display mt-1 leading-tight">{w.title}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
