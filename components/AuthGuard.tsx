"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Replaces the (Edge-incompatible) middleware. Runs in the browser: checks the
// Supabase session and redirects to /login when signed out. Auth pages are exempt.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session && !isAuthRoute) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });
    // react to sign-in / sign-out while the app is open
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session && !isAuthRoute) router.replace("/login");
      if (session && isAuthRoute) router.replace("/");
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [path, isAuthRoute, router]);

  // On auth pages, render immediately. Elsewhere, wait until the session check passes.
  if (isAuthRoute) return <>{children}</>;
  if (!ready) return null;
  return <>{children}</>;
}
