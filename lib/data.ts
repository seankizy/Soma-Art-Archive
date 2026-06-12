import { supabase } from "./supabase";
import type { Artwork, Collection, Relationship } from "./types";

export async function fetchRelationships(artworkId: string): Promise<{ rel: Relationship; other: Artwork }[]> {
  const { data: rels } = await supabase
    .from("relationships")
    .select("*")
    .or(`from_id.eq.${artworkId},to_id.eq.${artworkId}`);
  if (!rels?.length) return [];
  const otherIds = rels.map((r) => (r.from_id === artworkId ? r.to_id : r.from_id));
  const { data: others } = await supabase.from("artworks").select("*").in("id", otherIds);
  const byId: Record<string, Artwork> = Object.fromEntries((others ?? []).map((a) => [a.id, a]));
  return (rels as Relationship[])
    .map((rel) => ({ rel, other: byId[rel.from_id === artworkId ? rel.to_id : rel.from_id] }))
    .filter((x) => x.other);
}

export async function addRelationship(fromId: string, toId: string, kind: string) {
  await supabase.from("relationships").insert({ from_id: fromId, to_id: toId, kind });
}

export async function removeRelationship(id: string) {
  await supabase.from("relationships").delete().eq("id", id);
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data } = await supabase
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function fetchArtworks(opts: {
  search?: string;
  collectionId?: string | null;
  tag?: string | null;
}): Promise<Artwork[]> {
  let q = supabase.from("artworks").select("*");

  if (opts.search && opts.search.trim()) {
    // websearch_to_tsquery: natural search syntax ("stone carving -bronze")
    q = q.textSearch("fts", opts.search.trim(), {
      type: "websearch",
      config: "english",
    });
  }
  if (opts.collectionId) q = q.eq("collection_id", opts.collectionId);
  if (opts.tag) q = q.contains("tags", [opts.tag]);

  q = q.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  const { data } = await q;
  return (data ?? []) as Artwork[];
}

export async function allTags(): Promise<string[]> {
  const { data } = await supabase.from("artworks").select("tags");
  const set = new Set<string>();
  (data ?? []).forEach((r: any) => (r.tags ?? []).forEach((t: string) => set.add(t)));
  return [...set].sort();
}

export async function updateSortOrder(items: { id: string; sort_order: number }[]) {
  await Promise.all(
    items.map((i) =>
      supabase.from("artworks").update({ sort_order: i.sort_order }).eq("id", i.id)
    )
  );
}
