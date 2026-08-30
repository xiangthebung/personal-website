import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
/* The page furniture that belongs to no room — currently the skip link. Beside
   globals.css rather than inside it, and render-blocking like it, because the
   element it styles is the first thing in the document on every route. */
import "./site-chrome.css";

/**
 * One sentence, so a share of this link is not a title and a photograph with
 * nothing about what the page is.
 *
 * It used to end with a generated test count read out of `app/ledger.generated.ts`.
 * The page does not print counts any more, and a search result should not be the
 * one place left that does — so it names the projects instead, which is what
 * someone reading a search result wants to know.
 *
 * Every number in it was wrong for a while, which is the worst place on the site
 * for that to happen: this string is the meta description, the `og:description`
 * and the `twitter:description`, so it is the sentence a stranger reads before
 * they have seen anything the page could correct it with. It said seven projects,
 * four Chrome extensions and one choir app while `projects.ts` held ten, six and
 * one. Counted against that file today: six Chrome extensions, three things that
 * run in a browser tab — Choir Practice, PDF Explainer and N-Back — and Totem,
 * which is iOS, Android and web. If a project is added, this sentence is part of
 * adding it.
 */
const DESCRIPTION =
  `Ten side projects, each running on the page as a self-driving scene: ` +
  `six Chrome extensions, a choir rehearsal app, a PDF study workspace, an ` +
  `n-back game and a todo list kept in symbols.`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches the paper background so the browser chrome blends into the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0efe9" },
    { media: "(prefers-color-scheme: dark)", color: "#161917" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-xiang-li.png`;

  return {
    title: "Xiang Li",
    description: DESCRIPTION,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      title: "Xiang Li",
      description: DESCRIPTION,
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "Xiang Li",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Xiang Li",
      description: DESCRIPTION,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Who this page is about, for anything that reads pages by machine. Only
     claims that hold anywhere the site is served, so no URL: the host is not
     known here, and a hardcoded one would be the exact kind of quietly-stale
     fact this site exists to avoid. */
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Xiang Li",
    email: "mailto:xiangli3625@gmail.com",
    sameAs: ["https://github.com/xiangthebung"],
  };

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }}
        />
      </body>
    </html>
  );
}
