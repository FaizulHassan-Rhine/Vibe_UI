import type { Metadata } from "next";
import {
  Caveat,
  IBM_Plex_Mono,
  Inter,
  Inter_Tight,
  Newsreader,
  Noto_Sans_JP,
  Playfair_Display,
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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
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
  title: "Noa · Reelmark · Leon Vasari · Blendy · Distill · Gallery",
  description:
    "Point-cloud portrait, Reelmark marketplace hero, Leon Vasari curved VHS archive, Blendy smoothie slider, Distill AI-readability comparison, and a 3D photo-globe gallery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} ${inter.variable} ${interTight.variable} ${caveat.variable} ${newsreader.variable} ${ibmPlexMono.variable} ${playfair.variable} ${notoSansJp.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
