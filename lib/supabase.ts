import { createBrowserClient } from "@supabase/ssr";

// Session-aware browser client. The auth cookie rides along on every request,
// so RLS "authenticated" policies pass once you're signed in.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const BUCKET = "artwork-images";

export function imageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
