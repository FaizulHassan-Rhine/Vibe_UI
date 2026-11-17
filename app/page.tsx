import { BlendyHero } from "@/components/blendy";
import { Hero } from "@/components/hero";
import { ReelmarkHero } from "@/components/reelmark";
import { VasariHero } from "@/components/vasari";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ReelmarkHero />
      <VasariHero />
      <BlendyHero />
    </main>
  );
}
