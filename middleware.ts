import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session and redirects signed-out users to /login.
// Wrapped in try/catch so any failure degrades gracefully instead of returning
// a 500 (MIDDLEWARE_INVOCATION_FAILED) for the whole site.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If env vars are missing, don't crash — just let the request through.
  if (!url || !key) return res;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: any }[]) => {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    const path = req.nextUrl.pathname;
    const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
    if (!user && !isAuthRoute) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    return res;
  } catch {
    // On any auth error, fail open rather than 500 the whole site.
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api).*)"],
};
