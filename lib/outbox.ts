// A tiny offline queue. When you add a work without a connection, the entry
// (metadata + image blob) is stored here and flushed to Supabase on reconnect.
import { supabase, BUCKET } from "./supabase";

const DB = "soma-outbox";
const STORE = "pending";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export type PendingWork = {
  id: string;
  row: Record<string, any>; // the artworks insert payload (without image_path)
  imageBlob?: Blob;
};

export async function queueWork(p: PendingWork) {
  const db = await open();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(p);
    tx.oncomplete = () => res(null);
    tx.onerror = () => rej(tx.error);
  });
}

export async function pendingCount(): Promise<number> {
  const db = await open();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => res(req.result);
    req.onerror = () => res(0);
  });
}

export async function flushOutbox(): Promise<number> {
  if (!navigator.onLine) return 0;
  const db = await open();
  const items: PendingWork[] = await new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result as PendingWork[]);
    req.onerror = () => res([]);
  });

  let synced = 0;
  for (const item of items) {
    try {
      let image_path: string | null = null;
      if (item.imageBlob) {
        const path = `${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, item.imageBlob, { contentType: "image/webp" });
        if (!error) image_path = path;
      }
      const { error } = await supabase.from("artworks").insert({
        ...item.row, image_path, images: image_path ? [image_path] : [],
      });
      if (!error) {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(item.id);
        synced++;
      }
    } catch {
      /* leave in queue for next time */
    }
  }
  return synced;
}
