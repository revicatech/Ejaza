import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { SearchCard } from "@/components/sections/SearchCard";
import { Intro } from "@/components/sections/Intro";
import { StatsBand } from "@/components/sections/StatsBand";
import { Listings } from "@/components/sections/Listings";
import { OwnerSection } from "@/components/sections/OwnerSection";
import { CtaBand } from "@/components/sections/CtaBand";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SearchCard />
        <Intro />
        <StatsBand />
        <Listings />
        <OwnerSection />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
