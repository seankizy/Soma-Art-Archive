import { NextResponse, type NextRequest } from "next/server";

// Auth is handled client-side in components/AuthGuard.tsx.
// This middleware intentionally does nothing (Supabase can't run in the Edge runtime).
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: [] };
