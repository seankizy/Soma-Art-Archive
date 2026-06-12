import JSZip from "jszip";
import { supabase, imageUrl } from "./supabase";
import type { Artwork } from "./types";

// Downloads the entire archive — every record plus every image — as a single zip.
// This is your portability guarantee: nothing is locked inside Supabase.
export async function exportBackup() {
  const [{ data: artworks }, { data: collections }, { data: relationships }] = await Promise.all([
    supabase.from("artworks").select("*"),
    supabase.from("collections").select("*"),
    supabase.from("relationships").select("*"),
  ]);

  const zip = new JSZip();
  zip.file(
    "archive.json",
    JSON.stringify(
      { exported_at: new Date().toISOString(), artworks, collections, relationships },
      null,
      2
    )
  );

  // Bibliography as a readable text file, pulled from every work's sources.
  const biblio: string[] = [];
  (artworks ?? []).forEach((a: Artwork) => {
    (a.sources ?? []).forEach((s) => {
      biblio.push(`${a.title}${a.artist ? ` — ${a.artist}` : ""}: ${s.citation}${s.url ? ` (${s.url})` : ""}`);
    });
  });
  if (biblio.length) zip.file("bibliography.txt", biblio.sort().join("\n"));

  // Images
  const imgFolder = zip.folder("images")!;
  const paths = new Set<string>();
  (artworks ?? []).forEach((a: Artwork) => {
    [a.image_path, a.card_image_path, ...(a.images ?? [])].forEach((p) => p && paths.add(p));
  });
  await Promise.all(
    [...paths].map(async (p) => {
      try {
        const url = imageUrl(p);
        if (!url) return;
        const blob = await (await fetch(url)).blob();
        imgFolder.file(p, blob);
      } catch {
        /* skip unreachable image */
      }
    })
  );

  const out = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(out);
  a.download = `soma-archive-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
}
