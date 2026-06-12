"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import ArtworkCard from "@/components/ArtworkCard";
import type { Artwork } from "@/lib/types";

export default function AskPage() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Artwork[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!q.trim()) return;
    setBusy(true); setAnswer(""); setResults([]);
    const { data: all } = await supabase.from("artworks").select("*");
    const index = (all ?? []).map((a: Artwork) => ({
      id: a.id, title: a.title, artist: a.artist, year: a.year, medium: a.medium,
      tags: a.tags, location: a.location, note: (a.notes ?? "").slice(0, 160),
    }));
    const res = await fetch("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, index }),
    });
    const out = await res.json();
    setAnswer(out.answer ?? "");
    const byId: Record<string, Artwork> = Object.fromEntries((all ?? []).map((a: Artwork) => [a.id, a]));
    setResults((out.ids ?? []).map((id: string) => byId[id]).filter(Boolean));
    setBusy(false);
  }

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <div className="flex items-end justify-between border-b hairline pb-5 mb-6">
        <div>
          <div className="label mb-1">ask your archive</div>
          <h1 className="font-display text-4xl leading-none">Inquiry</h1>
        </div>
        <a href="/" className="text-sm border hairline px-4 py-2 rounded-sm hover:bg-parchmentDk transition">← Grid</a>
      </div>

      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ask()}
        placeholder='e.g. "marble pieces I saw in Italy" or "anything with acanthus motifs"'
        className="w-full bg-transparent border-b hairline pb-2 font-display text-2xl placeholder:text-faded/60 focus:outline-none focus:border-rust"
      />
      <button onClick={ask} disabled={busy}
        className="mt-4 bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
        {busy ? "thinking…" : "Ask"}
      </button>

      {answer && (
        <p className="mt-6 text-[15px] leading-relaxed border-l-2 border-rust pl-4">{answer}</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
          {results.map((a) => <ArtworkCard key={a.id} art={a} />)}
        </div>
      )}
    </main>
  );
}
