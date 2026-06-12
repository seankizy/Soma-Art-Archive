import type { Metadata } from "next";
import "./globals.css";
import PWA from "@/components/PWA";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Soma Archive",
  description: "A lifetime archive of artworks encountered.",
  manifest: "/manifest.json",
};

export const viewport = { themeColor: "#ec5a2a" };

// Personal, data-driven pages — render on demand, not prerendered at build time.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts loaded at runtime via stylesheet so the build never depends on a
            Google Fonts fetch (which can time out and silently kill the build). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-parchment text-ink font-body antialiased">
        <PWA />
        <AuthGuard>
          {children}
          <BottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}
