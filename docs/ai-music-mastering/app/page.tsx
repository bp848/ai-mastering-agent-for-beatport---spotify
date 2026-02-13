import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { SocialProofSection } from "@/components/social-proof-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { FeaturesSection } from "@/components/features-section"
import { MasteringDemoSection } from "@/components/mastering-demo-section"
import { PricingSection } from "@/components/pricing-section"
import { FaqSection } from "@/components/faq-section"
import { FinalCtaSection } from "@/components/final-cta-section"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <SocialProofSection />
      <HowItWorksSection />
      <FeaturesSection />
      <MasteringDemoSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer />
    </main>
  )
}
