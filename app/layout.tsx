import type { Metadata } from "next";
import {
  Caveat,
  Inter,
  Inter_Tight,
  Newsreader,
  Noto_Sans_JP,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: "../fonts/geist.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const instrumentSerif = localFont({
  src: "../fonts/instrument-serif.woff2",
  variable: "--font-instrument-serif",
  weight: "400",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-caveat",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["500", "800"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Noa · Reelmark · Leon Vasari · Blendy",
  description:
    "Point-cloud portrait, Reelmark marketplace hero, Leon Vasari curved VHS archive, and Blendy smoothie slider.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} ${inter.variable} ${interTight.variable} ${caveat.variable} ${newsreader.variable} ${notoSansJp.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
