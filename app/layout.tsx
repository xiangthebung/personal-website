import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-v2.png`;

  return {
    title: "Xiang Li — Projects",
    description: "Six practical tools built with AI.",
    openGraph: {
      title: "Xiang Li — Projects",
      description: "Six practical tools built with AI.",
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "Xiang Li — Some tools I made",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Xiang Li — Projects",
      description: "Six practical tools built with AI.",
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
