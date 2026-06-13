"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("seankizy@gmail.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signIn() {
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    // AuthGuard detects the session change and redirects to /
  }

  return (
    <main className="no-navpad min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="label mb-1">a lifetime archive</div>
        <h1 className="font-display text-5xl leading-none mb-8">Soma Archive</h1>
        <div className="space-y-4">
          <div>
            <span className="label">email</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b hairline pb-1.5 focus:outline-none focus:border-rust"
            />
          </div>
          <div>
            <span className="label">password</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              className="w-full bg-transparent border-b hairline pb-1.5 focus:outline-none focus:border-rust"
              autoFocus
            />
          </div>
          {err && <p className="text-xs text-rust">{err}</p>}
          <button onClick={signIn} disabled={busy || !password}
            className="bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
            {busy ? "signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
