import { createBrowserClient } from "@supabase/ssr";

// Fallbacks keep the client from throwing if it's instantiated during the build
// (e.g. while Next collects page data) before runtime env vars are injected.
// At runtime in the browser, the real NEXT_PUBLIC_* values are always present.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Session-aware browser client. The auth cookie rides along on every request,
// so RLS "authenticated" policies pass once you're signed in.
export const supabase = createBrowserClient(url, key);

export const BUCKET = "artwork-images";

export function imageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
