import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kolibrie Studio",
  description:
    "Kolibrie: a small studio for scroll-stopping reels, films and motion.",
};

export default function KolibrieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
