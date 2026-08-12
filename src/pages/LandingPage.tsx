import { useRef } from "react";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhatIsSection } from "@/components/landing/WhatIsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { GrowthMotif } from "@/components/landing/GrowthMotif";

export default function Home() {
  const motifRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <Navbar />
      <HeroSection />
      <div ref={motifRef} className="relative">
        <GrowthMotif containerRef={motifRef} />
        <WhatIsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <StatsSection />
        <PricingSection />
        <CTASection />
        <FAQSection />
        <Footer />
      </div>
    </div>
  );
}
