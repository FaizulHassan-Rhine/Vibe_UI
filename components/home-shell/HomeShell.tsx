"use client";

import { useEffect } from "react";

/** Enables full-page scroll snap on the home route only. */
export default function HomeShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("home-pages");
    return () => html.classList.remove("home-pages");
  }, []);

  return children;
}
