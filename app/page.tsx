import { BlendyHero } from "@/components/blendy";
import { Hero } from "@/components/hero";
import { ReelmarkHero } from "@/components/reelmark";
import { SiteNav } from "@/components/site-nav";
import { VasariHero } from "@/components/vasari";

export default function HomePage() {
  return (
    <main>
      <SiteNav />
      <Hero />
      <ReelmarkHero />
      <VasariHero />
      <BlendyHero />
    </main>
  );
}
