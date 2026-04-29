"use client"

import { useRef } from "react"
import { ArrowRight } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"
import { Link } from "react-router"

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="cta" className="relative border-t border-border/40 px-6 py-36 sm:px-10 md:py-48 lg:px-16">
      {/* Background center line continues from hero */}
      <div className="pointer-events-none absolute inset-y-0 left-[calc(50%-0.5px)] w-px bg-border/20" />

      <div ref={ref} className="relative z-10 mx-auto max-w-[90rem]">
        <div className="flex flex-col items-center text-center">
          <h2
            className={`max-w-4xl font-serif text-[clamp(2.5rem,6vw,5.5rem)] font-normal leading-[0.95] tracking-[-0.02em] text-foreground transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
          >
            Turn completed <span className="italic text-primary">work</span> into lasting relationships
          </h2>

          <p
            className={`mx-auto mt-8 max-w-lg text-pretty text-lg leading-[1.7] text-muted-foreground transition-all duration-1000 delay-150 ${isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
          >
            Self-custodial wallet with Lightning checkout offerring earned token discounts that drive repeating revenue. <br /><br />Start with UI, scale to API.
          </p>

          <div className={`mt-12 transition-all duration-1000 delay-300 ${isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            <Link
              to="/app"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground px-10 py-4.5 text-[15px] font-medium text-background transition-all duration-300 hover:shadow-lg hover:shadow-foreground/10"
            >
              Start building today
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <p className={`mt-8 text-[13px] tracking-wide text-muted-foreground/50 transition-all duration-1000 delay-500 ${isInView ? "opacity-100" : "opacity-0"}`}>
            No subscription. Create wallet, then payment requests at ~$1 per checkout.
          </p>
        </div>
      </div>
    </section>
  )
}
