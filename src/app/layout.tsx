import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fade the Public",
  description:
    "Track games where the public is heavily on one side and measure how profitable fading them is.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Fade<span className="text-emerald-400">.</span>Public
            </Link>
            <div className="flex gap-6 text-sm text-zinc-300">
              <Link href="/upcoming" className="hover:text-white">
                Upcoming
              </Link>
              <Link href="/history" className="hover:text-white">
                History
              </Link>
              <Link href="/how-it-works" className="hover:text-white">
                How It Works
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
          Data sourced from public consensus feeds. For entertainment only.
        </footer>
      </body>
    </html>
  );
}
