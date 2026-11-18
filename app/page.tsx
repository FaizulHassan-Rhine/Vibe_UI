import { BlendyHero } from "@/components/blendy";
import { DistillHero } from "@/components/distill";
import { GalleryHero } from "@/components/gallery";
import { Hero } from "@/components/hero";
import HomeShell from "@/components/home-shell/HomeShell";
import { ReelmarkHero } from "@/components/reelmark";
import { SiteNav } from "@/components/site-nav";
import { VasariHero } from "@/components/vasari";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <HomeShell>
      <main className={styles.pages} data-home-pages>
        <SiteNav />
        <Hero />
        <ReelmarkHero />
        <VasariHero />
        <BlendyHero />
        <DistillHero />
        <GalleryHero />
      </main>
    </HomeShell>
  );
}
