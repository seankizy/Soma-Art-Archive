import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import PWA from "@/components/PWA";
import BottomNav from "@/components/BottomNav";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Soma Archive",
  description: "A lifetime archive of artworks encountered.",
  manifest: "/manifest.json",
};

export const viewport = { themeColor: "#ec5a2a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-parchment text-ink font-body antialiased">
        <PWA />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
