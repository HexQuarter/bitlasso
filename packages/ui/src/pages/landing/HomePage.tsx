import { Navbar } from '@/components/landing/navbar.tsx'
import { HeroSection } from '@/components/landing/home/hero'
import { HowItWorksSection } from '@/components/landing/home/how-it-works-section'
import { CtaSection } from '@/components/landing/home/cta-section'
import { Footer } from '@/components/landing/footer.tsx'
import { WhyBitlassoSection } from '@/components/landing/home/why-bitlasso-section'

export const HomePage = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <WhyBitlassoSection />
      <CtaSection />
      <Footer />
    </main>
  )
}