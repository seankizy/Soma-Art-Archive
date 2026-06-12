"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, BUCKET } from "@/lib/supabase";
import { compressImage, fileToBase64 } from "@/lib/compress";
import { gpsFromImage, gpsFromDevice, placeName, type Geo } from "@/lib/geo";
import { fetchCollections } from "@/lib/data";
import type { Collection } from "@/lib/types";

export default function AddPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState({
    title: "", artist: "", year: "", medium: "", dimensions: "",
    location: "", notes: "", tags: "", collection_id: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ai, setAi] = useState<{ description: string; links: any[] } | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [geoSource, setGeoSource] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function suggestTags() {
    if (!file) return alert("Add a photo first.");
    setSuggesting(true);
    const small = await compressImage(file);
    const { mediaType, data } = await fileToBase64(small);
    const res = await fetch("/api/autotag", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType, data, title: form.title, medium: form.medium }),
    });
    const out = await res.json();
    if (out.tags?.length) {
      const existing = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...out.tags])];
      set("tags", merged.join(", "));
    }
    setSuggesting(false);
  }

  useEffect(() => { fetchCollections().then(setCollections); }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) {
      const g = await gpsFromImage(f); // automatic from photo EXIF
      if (g) {
        setGeo(g);
        setGeoSource("from photo");
        const name = await placeName(g);
        if (name && !form.location) set("location", name);
      }
    }
  }

  async function useDeviceLocation() {
    const g = await gpsFromDevice();
    if (!g) return alert("Couldn't get location — allow location access or set it manually.");
    setGeo(g);
    setGeoSource("from device");
    const name = await placeName(g);
    if (name && !form.location) set("location", name);
  }

  async function enrich() {
    setEnriching(true);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setAi({ description: data.description, links: data.links ?? [] });
    } catch (e) { alert("Enrich failed — check API key."); }
    setEnriching(false);
  }

  async function save() {
    if (!form.title.trim()) return alert("Title required");
    setBusy(true);
    let image_path: string | null = null;

    if (file) {
      const compressed = await compressImage(file);
      const ext = "webp";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
        contentType: compressed.type,
      });
      if (!error) image_path = path;
    }

    const { data, error } = await supabase.from("artworks").insert({
      title: form.title,
      artist: form.artist || null,
      year: form.year || null,
      medium: form.medium || null,
      dimensions: form.dimensions || null,
      location: form.location || null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      notes: form.notes || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      collection_id: form.collection_id || null,
      image_path,
      images: image_path ? [image_path] : [],
      ai_description: ai?.description ?? null,
      ai_links: ai?.links ?? [],
    }).select().single();

    setBusy(false);
    if (error) return alert(error.message);
    router.push(`/artwork/${data.id}`);
  }

  const field = "w-full bg-transparent border-b hairline pb-1.5 focus:outline-none focus:border-rust transition";

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <a href="/" className="label hover:text-rust">← archive</a>
      <h1 className="font-display text-4xl mt-3 mb-8">Add a work</h1>

      <div className="space-y-6">
        <label className="block cursor-pointer">
          <span className="label">image</span>
          <div className="mt-2 aspect-[4/3] border hairline border-dashed rounded-sm flex items-center justify-center bg-parchmentDk/40 overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-faded text-sm">tap to add a photo (auto-compressed)</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>

        <div><span className="label">title</span>
          <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="label">artist</span>
            <input className={field} value={form.artist} onChange={(e) => set("artist", e.target.value)} /></div>
          <div><span className="label">year</span>
            <input className={field} value={form.year} onChange={(e) => set("year", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="label">medium</span>
            <input className={field} value={form.medium} onChange={(e) => set("medium", e.target.value)} /></div>
          <div><span className="label">dimensions</span>
            <input className={field} value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} /></div>
        </div>
        <div><span className="label">where you encountered it</span>
          <input className={field} value={form.location} onChange={(e) => set("location", e.target.value)} />
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={useDeviceLocation}
              className="text-xs border hairline px-3 py-1 rounded-sm hover:bg-parchmentDk transition">
              Use current location
            </button>
            {geo
              ? <span className="label text-sage">
                  pinned {geoSource} · {geo.latitude.toFixed(3)}, {geo.longitude.toFixed(3)}
                </span>
              : <span className="label">no coordinates — add a GPS photo or tap above</span>}
          </div>
        </div>
        <div><span className="label">your notes</span>
          <textarea rows={3} className={field} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="label">tags (comma separated)</span>
            <input className={field} value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            <button type="button" onClick={suggestTags} disabled={suggesting}
              className="text-xs text-sage mt-1 disabled:opacity-50">{suggesting ? "looking…" : "✨ suggest tags from photo"}</button>
          </div>
          <div><span className="label">collection</span>
            <select className={field} value={form.collection_id} onChange={(e) => set("collection_id", e.target.value)}>
              <option value="">—</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>

        {/* AI enrich */}
        <div className="border hairline rounded-sm p-4 bg-parchmentDk/30">
          <div className="flex items-center justify-between">
            <span className="label">AI research</span>
            <button onClick={enrich} disabled={enriching}
              className="text-sm bg-sage text-parchment px-3 py-1 rounded-sm hover:opacity-90 disabled:opacity-50">
              {enriching ? "researching…" : "Enrich with AI"}
            </button>
          </div>
          {ai && (
            <div className="mt-3 space-y-2">
              <p className="text-sm leading-relaxed">{ai.description}</p>
              <div className="flex flex-wrap gap-2">
                {ai.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer"
                    className="text-xs text-rust underline">{l.label} ↗</a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={busy}
            className="bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
            {busy ? "saving…" : "Save to archive"}
          </button>
        </div>
      </div>
    </main>
  );
}
