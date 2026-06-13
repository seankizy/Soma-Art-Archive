"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, imageUrl } from "@/lib/supabase";
import { fetchCollections, fetchRelationships, addRelationship, removeRelationship } from "@/lib/data";
import type { Artwork, Collection, Source } from "@/lib/types";

const REL_KINDS = ["related", "cast_of", "study_for", "influenced_by", "part_of"];
const REL_LABEL: Record<string, string> = {
  related: "related to", cast_of: "cast of", study_for: "study for",
  influenced_by: "influenced by", part_of: "part of",
};

export default function ArtworkDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [art, setArt] = useState<Artwork | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Artwork> & { tagsText?: string }>({});
  const [rels, setRels] = useState<{ rel: any; other: Artwork }[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<Artwork[]>([]);
  const [linkKind, setLinkKind] = useState("related");
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("artworks").select("*").eq("id", params.id).single()
      .then(({ data }) => setArt(data as Artwork));
    fetchCollections().then(setCollections);
    fetchRelationships(params.id).then(setRels);
  }, [params.id]);

  async function searchToLink(q: string) {
    setLinkQuery(q);
    if (!q.trim()) { setLinkResults([]); return; }
    const { data } = await supabase.from("artworks").select("*").ilike("title", `%${q}%`).limit(6);
    setLinkResults((data ?? []).filter((a: Artwork) => a.id !== params.id) as Artwork[]);
  }
  async function link(toId: string) {
    if (toId === params.id) return; // can't link to itself
    if (rels.some((r) => r.other.id === toId)) { // already linked
      setLinking(false); setLinkQuery(""); setLinkResults([]);
      return;
    }
    await addRelationship(params.id, toId, linkKind);
    setLinking(false); setLinkQuery(""); setLinkResults([]);
    fetchRelationships(params.id).then(setRels);
  }
  async function unlink(id: string) {
    await removeRelationship(id);
    fetchRelationships(params.id).then(setRels);
  }

  // sources editing (within draft)
  function setSources(next: Source[]) { setDraft((d) => ({ ...d, sources: next })); }

  function startEdit() {
    if (!art) return;
    setDraft({ ...art, tagsText: (art.tags ?? []).join(", ") });
    setEditing(true);
  }
  function setD(k: string, v: any) { setDraft((d) => ({ ...d, [k]: v })); }

  async function addCollection() {
    const name = prompt("New collection name?");
    if (!name?.trim()) return;
    const { data } = await supabase.from("collections").insert({ name: name.trim() }).select().single();
    if (data) { setCollections((c) => [...c, data as Collection]); setD("collection_id", data.id); }
  }

  async function save() {
    if (!art) return;
    setSaving(true);
    const tags = (draft.tagsText ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const patch = {
      title: draft.title ?? art.title,
      artist: draft.artist ?? null, year: draft.year ?? null, medium: draft.medium ?? null,
      dimensions: draft.dimensions ?? null, location: draft.location ?? null,
      notes: draft.notes ?? null, tags, collection_id: draft.collection_id || null,
      sources: draft.sources ?? art.sources ?? [],
      image_path: draft.image_path ?? art.image_path,
      images: draft.images ?? art.images,
    };
    const { data, error } = await supabase.from("artworks").update(patch).eq("id", art.id).select().single();
    setSaving(false);
    if (error) { alert("Couldn't save: " + error.message); return; }
    if (data) setArt(data as Artwork);
    setEditing(false);
  }

  async function reEnrich() {
    if (!art) return;
    setEnriching(true);
    const res = await fetch("/api/enrich", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(art),
    });
    const data = await res.json();
    await supabase.from("artworks").update({ ai_description: data.description, ai_links: data.links ?? [] }).eq("id", art.id);
    setArt({ ...art, ai_description: data.description, ai_links: data.links ?? [] });
    setEnriching(false);
  }

  async function remove() {
    if (!art || !confirm("Delete this work?")) return;
    const paths = [art.image_path, art.card_image_path, ...(art.images ?? [])].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("artwork-images").remove(paths);
    await supabase.from("artworks").delete().eq("id", art.id);
    router.push("/");
  }

  if (!art) return <main className="max-w-4xl mx-auto px-6 py-20 label">loading…</main>;

  const gallery = [art.image_path, art.card_image_path, ...(art.images ?? [])]
    .filter((p, i, a) => p && a.indexOf(p) === i) as string[];
  const field = "w-full bg-transparent border-b hairline pb-1 focus:outline-none focus:border-rust";

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center">
        <a href="/" className="label hover:text-rust">← archive</a>
        {!editing && <button onClick={startEdit} className="text-sm border hairline px-4 py-1.5 rounded-sm hover:bg-parchmentDk transition">Edit</button>}
      </div>

      <div className="grid md:grid-cols-2 gap-10 mt-6">
        <div>
          <div className="bg-parchmentDk rounded-sm overflow-hidden border hairline">
            {imageUrl(gallery[0]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(gallery[0])!} alt={art.title} className="w-full object-cover" />
            ) : <div className="aspect-[4/5] flex items-center justify-center label">no image</div>}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-2">
              {gallery.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={imageUrl(p)!} alt="" className="w-16 h-16 object-cover rounded-sm border hairline" />
              ))}
            </div>
          )}
        </div>

        <div>
          {editing ? (
            <div className="space-y-4">
              {/* Image management in edit mode */}
              {gallery.length > 0 && (
                <div>
                  <span className="label">photos — tap to set cover, × to remove</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {gallery.map((p) => {
                      const draftImages = draft.images ?? art.images ?? [];
                      const draftCover = draft.image_path ?? art.image_path;
                      const isCover = p === draftCover;
                      return (
                        <div key={p} className="relative group cursor-pointer"
                          onClick={() => setD("image_path", p)}
                          title={isCover ? "Cover photo" : "Tap to set as cover"}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl(p)!} alt="" className={`w-20 h-20 object-cover rounded-sm transition ${isCover ? "ring-2 ring-rust" : "opacity-60 hover:opacity-100"}`} />
                          {isCover && <span className="absolute top-1 left-1 label bg-rust text-parchment px-1 rounded-sm">cover</span>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newImages = draftImages.filter((x: string) => x !== p);
                              const newCover = isCover ? (newImages[0] ?? null) : draftCover;
                              setD("images", newImages);
                              setD("image_path", newCover);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 text-parchment text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rust"
                            title="Remove photo">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div><span className="label">title</span>
                <input className={`${field} font-display text-2xl`} value={draft.title ?? ""} onChange={(e) => setD("title", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="label">artist</span><input className={field} value={draft.artist ?? ""} onChange={(e) => setD("artist", e.target.value)} /></div>
                <div><span className="label">year</span><input className={field} value={draft.year ?? ""} onChange={(e) => setD("year", e.target.value)} /></div>
                <div><span className="label">medium</span><input className={field} value={draft.medium ?? ""} onChange={(e) => setD("medium", e.target.value)} /></div>
                <div><span className="label">dimensions</span><input className={field} value={draft.dimensions ?? ""} onChange={(e) => setD("dimensions", e.target.value)} /></div>
              </div>
              <div><span className="label">where encountered</span><input className={field} value={draft.location ?? ""} onChange={(e) => setD("location", e.target.value)} /></div>
              <div><span className="label">tags (comma separated)</span>
                <input className={field} value={draft.tagsText ?? ""} onChange={(e) => setD("tagsText", e.target.value)} /></div>
              <div><span className="label">collection</span>
                <div className="flex gap-2 items-center">
                  <select className={field} value={draft.collection_id ?? ""} onChange={(e) => setD("collection_id", e.target.value)}>
                    <option value="">—</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={addCollection} className="text-xs text-rust whitespace-nowrap">+ new</button>
                </div>
              </div>
              <div><span className="label">notes</span>
                <textarea rows={3} className={field} value={draft.notes ?? ""} onChange={(e) => setD("notes", e.target.value)} /></div>

              <div>
                <span className="label">sources / bibliography</span>
                <div className="space-y-2 mt-1">
                  {(draft.sources ?? []).map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={field} placeholder="citation" value={s.citation}
                        onChange={(e) => setSources((draft.sources ?? []).map((x, j) => j === i ? { ...x, citation: e.target.value } : x))} />
                      <input className={`${field} max-w-[140px]`} placeholder="url" value={s.url ?? ""}
                        onChange={(e) => setSources((draft.sources ?? []).map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                      <button onClick={() => setSources((draft.sources ?? []).filter((_, j) => j !== i))} className="text-faded hover:text-rust text-sm">×</button>
                    </div>
                  ))}
                  <button onClick={() => setSources([...(draft.sources ?? []), { citation: "", url: "" }])}
                    className="text-xs text-rust">+ add source</button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="bg-ink text-parchment px-6 py-2 rounded-sm hover:bg-rust transition disabled:opacity-50">
                  {saving ? "saving…" : "Save changes"}
                </button>
                <button onClick={() => setEditing(false)} className="text-sm text-faded hover:text-rust">cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-4xl leading-tight">{art.title}</h1>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 mt-6 border-t hairline pt-6">
                {([["artist", art.artist], ["year", art.year], ["medium", art.medium], ["dimensions", art.dimensions], ["encountered", art.location]] as [string, string | null][])
                  .filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}><div className="label">{k}</div><div className="text-sm">{v}</div></div>
                  ))}
              </div>
              {art.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {art.tags.map((t) => <span key={t} className="label px-2 py-0.5 bg-parchmentDk rounded-full">{t}</span>)}
                </div>
              )}
              {art.notes && (
                <div className="mt-6"><div className="label mb-1">notes</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{art.notes}</p></div>
              )}
              <div className="mt-6 border-t hairline pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="label">AI research</div>
                  <button onClick={reEnrich} disabled={enriching} className="text-xs text-sage underline disabled:opacity-50">
                    {enriching ? "…" : art.ai_description ? "refresh" : "enrich"}
                  </button>
                </div>
                {art.ai_description ? <p className="text-sm leading-relaxed">{art.ai_description}</p>
                  : <p className="text-sm text-faded italic">Not yet enriched.</p>}
                {art.ai_links?.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {art.ai_links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" className="text-xs text-rust underline">{l.label} ↗</a>
                    ))}
                  </div>
                )}
              </div>
              {art.sources?.length > 0 && (
                <div className="mt-6 border-t hairline pt-6">
                  <div className="label mb-2">sources</div>
                  <ul className="space-y-1">
                    {art.sources.map((s, i) => (
                      <li key={i} className="text-sm">
                        {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-rust underline">{s.citation}</a> : s.citation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 border-t hairline pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="label">related works</div>
                  <button onClick={() => setLinking((v) => !v)} className="text-xs text-rust">{linking ? "done" : "+ link"}</button>
                </div>
                {linking && (
                  <div className="mb-3 space-y-2">
                    <div className="flex gap-2">
                      <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)} className="text-sm bg-transparent border hairline rounded-sm px-2 py-1">
                        {REL_KINDS.map((k) => <option key={k} value={k}>{REL_LABEL[k]}</option>)}
                      </select>
                      <input value={linkQuery} onChange={(e) => searchToLink(e.target.value)} placeholder="search title…"
                        className="flex-1 bg-transparent border-b hairline focus:outline-none focus:border-rust text-sm" />
                    </div>
                    {linkResults.map((r) => (
                      <button key={r.id} onClick={() => link(r.id)} className="block text-left text-sm hover:text-rust">→ {r.title}</button>
                    ))}
                  </div>
                )}
                {rels.length === 0 ? (
                  <p className="text-sm text-faded italic">No links yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {rels.map(({ rel, other }) => (
                      <li key={rel.id} className="text-sm flex items-center gap-2">
                        <span className="label">{REL_LABEL[rel.kind] ?? rel.kind}</span>
                        <a href={`/artwork/${other.id}`} className="text-rust underline">{other.title}</a>
                        <button onClick={() => unlink(rel.id)} className="text-faded hover:text-rust ml-auto">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button onClick={remove} className="mt-8 text-xs text-faded hover:text-rust transition">delete work</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
