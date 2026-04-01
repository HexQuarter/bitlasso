import { Navbar } from '@/components/landing/navbar.tsx'
import { HeroSection } from '@/components/landing/hero.tsx'
import { ProblemSection } from '@/components/landing/problem-section.tsx'
import { HowItWorksSection } from '@/components/landing/how-it-works-section.tsx'
// import { WhyBitcoinSection } from '@/components/landing/why-bitcoin-section.tsx'
import { OperationalSection } from '@/components/landing/operation-section.tsx'
import { SelfCustodySection } from '@/components/landing/self-custody-section.tsx'
import { PricingSection } from '@/components/landing/pricing-section.tsx'
import { CtaSection } from '@/components/landing/cta-section.tsx'
import { Footer } from '@/components/landing/footer.tsx'
import { DecentralizationSection } from '@/components/landing/decentralization-section'

export const LandingPage = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      {/* <WhyBitcoinSection /> */}
      <OperationalSection />
      <DecentralizationSection />
      <SelfCustodySection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </main>
  )
}