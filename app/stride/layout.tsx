import type { Metadata } from "next";
import { Archivo_Black, DM_Mono } from "next/font/google";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stride: Plant Protein Bars",
  description: "Five bold flavours of plant protein bar. Pressed, not baked.",
};

export default function StrideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${archivoBlack.variable} ${dmMono.variable}`}>{children}</div>
  );
}
