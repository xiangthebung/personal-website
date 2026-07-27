import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

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
    openGraph: {
      title: "Xiang Li",
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
