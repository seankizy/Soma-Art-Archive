"use client";
import { useEffect } from "react";
import { flushOutbox } from "@/lib/outbox";

export default function PWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sync = () => flushOutbox().catch(() => {});
    sync(); // attempt on load
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);
  return null;
}
