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
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Xiang Li — A Small Software Workshop",
    description:
      "Practical software projects by Xiang Li, built for problems that kept bothering them.",
    openGraph: {
      title: "Xiang Li — A Small Software Workshop",
      description:
        "Six practical experiments in attention, transit, learning, music, memory, and the offline web.",
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1731,
          height: 909,
          alt: "Xiang Li — A Small Software Workshop",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Xiang Li — A Small Software Workshop",
      description:
        "Six practical experiments in attention, transit, learning, music, memory, and the offline web.",
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
