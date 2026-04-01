"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"

const comparison = {
  traditional: [
    "Platforms take 1–2% of every transaction",
    "Funds are held custodially",
    "Bitcoin treated like legacy payments",
    "Retention is an afterthought",
  ],
  bitlasso: [
    "Flat fee, not a tax on your growth",
    "Direct to your own wallet",
    "Built for Bitcoin-native payment flow",
    "Retention-first, ownership-first",
  ],
}

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="problem" className="relative border-t border-border/40 px-6 py-32 sm:px-10 md:py-40 lg:px-16 bg-slate-50">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        <div className="grid gap-20">
          <div className="space-y-10">
            <div className={`transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
              <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">The problem</p>
            </div>
            <div className={`transition-all duration-1000 delay-100 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
              <h2 className="font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight">
                Accepting Bitcoin…<br /><span className="text-primary">until the tools get in the way</span>
              </h2>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
                Lower fees, global payments, no chargebacks, aligned with the future. But every platform still takes custody, fees, and treats Bitcoin like legacy payments.
              </p>
            </div>

            <div className="space-y-10">
              <div className={`overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-1000 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
                <div className="grid md:grid-cols-2">
                  <div className="border-b border-border/40 p-8 md:border-r md:border-b-0 md:p-12">
                    <p className="mb-8 font-mono text-[10px] font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">Traditional loyalty</p>
                    <div className="flex flex-col gap-5">
                      {comparison.traditional.map((item) => (
                        <div key={item} className="flex items-center gap-4">
                          <div className="h-px w-4 bg-muted-foreground/20" />
                          <span className="text-[15px] text-muted-foreground/70 line-through decoration-muted-foreground/20">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-8 md:p-12">
                    <p className="mb-8 font-mono text-[10px] font-medium tracking-[0.2em] text-primary uppercase">How this is different</p>
                    <div className="flex flex-col gap-5">
                      {comparison.bitlasso.map((item) => (
                        <div key={item} className="flex items-center gap-4">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span className="text-[15px] font-medium text-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </section>
  )
}
