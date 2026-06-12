"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { exportBackup } from "@/lib/backup";

const TABS = [
  { href: "/", label: "Archive", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/map", label: "Map", icon: "M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16" },
  { href: "/timeline", label: "Timeline", icon: "M12 8v8M12 2a10 10 0 100 20 10 10 0 000-20zM12 12l3 2" },
  { href: "/ask", label: "Ask", icon: "M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z" },
];

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#ec5a2a" : "#241a10"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);

  if (path === "/login") return null;

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* dim backdrop when the More sheet is open */}
      {more && <div className="fixed inset-0 bg-ink/20 z-40" onClick={() => setMore(false)} />}

      {more && (
        <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-50 w-[min(420px,92vw)]
                        bg-parchment border hairline rounded-xl shadow-xl p-2 fade-up">
          <Link href="/import" onClick={() => setMore(false)}
            className="block px-4 py-3 rounded-lg hover:bg-parchmentDk transition text-sm">Batch import</Link>
          <button onClick={() => { setMore(false); exportBackup(); }}
            className="block w-full text-left px-4 py-3 rounded-lg hover:bg-parchmentDk transition text-sm">Backup archive (zip)</button>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-50 bg-parchment/95 backdrop-blur border-t hairline
                      flex items-center justify-around px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {TABS.slice(0, 2).map((t) => (
          <Link key={t.href} href={t.href} className="flex flex-col items-center gap-0.5 flex-1">
            <Icon d={t.icon} active={isActive(t.href)} />
            <span className="text-[0.6rem]" style={{ color: isActive(t.href) ? "#ec5a2a" : "#241a10" }}>{t.label}</span>
          </Link>
        ))}

        {/* center Add button */}
        <button onClick={() => router.push("/add")} className="flex-1 flex justify-center">
          <span className="w-12 h-12 -mt-6 rounded-full bg-ink text-parchment flex items-center justify-center
                           text-2xl shadow-lg hover:bg-rust transition">+</span>
        </button>

        {TABS.slice(2).map((t) => (
          <Link key={t.href} href={t.href} className="flex flex-col items-center gap-0.5 flex-1">
            <Icon d={t.icon} active={isActive(t.href)} />
            <span className="text-[0.6rem]" style={{ color: isActive(t.href) ? "#ec5a2a" : "#241a10" }}>{t.label}</span>
          </Link>
        ))}

        {/* More */}
        <button onClick={() => setMore((v) => !v)} className="flex flex-col items-center gap-0.5 flex-1">
          <Icon d="M5 12h.01M12 12h.01M19 12h.01" active={more} />
          <span className="text-[0.6rem]" style={{ color: more ? "#ec5a2a" : "#241a10" }}>More</span>
        </button>
      </nav>
    </>
  );
}
