"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signIn() {
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="no-navpad min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="label mb-1">a lifetime archive</div>
        <h1 className="font-display text-5xl leading-none mb-8">Soma Archive</h1>
        {sent ? (
          <p className="text-sm leading-relaxed">
            Check your email for a sign-in link. You can close this tab once you click it.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="label">email</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className="w-full bg-transparent border-b hairline pb-1.5 focus:outline-none focus:border-rust"
              />
            </div>
            {err && <p className="text-xs text-rust">{err}</p>}
            <button onClick={signIn} disabled={busy || !email}
              className="bg-ink text-parchment px-6 py-2.5 rounded-sm hover:bg-rust transition disabled:opacity-50">
              {busy ? "sending…" : "Send sign-in link"}
            </button>
            <p className="label">a magic link will be emailed to you — no password</p>
          </div>
        )}
      </div>
    </main>
  );
}
