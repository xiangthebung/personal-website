import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

/**
 * One sentence, so a share of this link is not a title and a photograph with
 * nothing about what the page is.
 *
 * It used to end with a generated test count read out of `app/ledger.generated.ts`.
 * The page does not print counts any more, and a search result should not be the
 * one place left that does — so it names the projects instead, which is what
 * someone reading a search result wants to know.
 */
const DESCRIPTION =
  `Seven side projects, each running on the page as a self-driving scene: ` +
  `a choir rehearsal app, four Chrome extensions, a PDF study workspace and an ` +
  `n-back game.`;

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
