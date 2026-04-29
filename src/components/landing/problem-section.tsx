"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Hammer, Sparkles } from "lucide-react"

// const comparison = {
//   traditional: [
//     "Platforms take 1–2% of every transaction",
//     "Funds are held custodially",
//     "Bitcoin treated like legacy payments, not agentic and automation oriented",
//     "Retention is an afterthought",
//   ],
//   bitlasso: [
//     "Flat fee, not a tax on your growth",
//     "Direct to your own wallet",
//     "Built for Lightning payment flow for API and AI agents (L402)",
//     "Retention-first, ownership-first",
//   ],
// }

const problems = [
  {
    title: "Bitcoin adoption hits a wall",
    description: "Lower fees, global payments, aligned with the future. But every platform takes custody, charges percentage fees, and treats Bitcoin like legacy payments.",
  },
  {
    title: "Existing platforms tax your growth",
    description: "1–2% of every transaction gone. Your funds held custodially. Zero programmability for automation.",
  },
  {
    title: "Retention is an afterthough",
    description: "Create repeatable business and incentivize customers requires manual work. Redemption flows are clunky. Scaling loyalty means more operational overhead.",
  },
  {
    title: "No programmable payments",
    description: "Can't build payment logic into your API. L402-gated services aren't possible. Autonomous systems remain a future dream.",
  },
]

const differentiators = [
  {
    icon: Sparkles,
    title: "Flat fee per request, not percentage tax",
    description: "Pay $1 per payment request (or less with bundles). No transaction cuts. Direct to your self-custodial wallet. Margins scale with your business.",
  },
  {
    icon: Hammer,
    title: "API + UI + L402-ready",
    description: "Create payment requests manually or programmatically via API. L402 payment gateway. Webhooks trigger token issuance. Ready for agentic automation tomorrow.",
  },
]

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
                Lower fees, global reach, aligned with the agentic future. But custody, fees, and zero programmability kill the Bitcoin promise.
              </p>
            </div>

            {/* <div className="space-y-10">
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
            </div> */}

            {/* Bento grid - varied card sizes */}
            <div className="mt-20 grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              {problems.map((problem, i) => {
                const spans = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"]
                return (
                  <div
                    key={problem.title}
                    className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all duration-700 hover:border-border/80 hover:shadow-lg md:p-10 ${spans[i]} ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
                    style={{ transitionDelay: isInView ? `${300 + i * 100}ms` : "0ms" }}
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 font-serif text-[8rem] font-bold leading-none text-foreground/[0.025]">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="relative">
                      <h3 className="text-lg font-semibold tracking-tight text-card-foreground md:text-xl">{problem.title}</h3>
                      <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-muted-foreground">{problem.description}</p>
                    </div>
                  </div>
                )
              })}


            </div>

            {/* Differentiators - full-width strip */}
            <div className="mt-24">
              <div className={`mb-10 flex items-center gap-8 transition-all duration-1000 ${isInView ? "opacity-100" : "opacity-0"}`}>
                <div className="h-px flex-1 bg-border/40" />
                <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">How this is different</p>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {differentiators.map((item, i) => (
                  <div
                    key={item.title}
                    className={`group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.025] p-8 transition-all duration-700 hover:border-primary/20 hover:shadow-lg md:p-10 ${isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                    style={{ transitionDelay: isInView ? `${800 + i * 120}ms` : "0ms" }}
                  >
                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition-all duration-300 group-hover:bg-primary/15">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                    <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>


        </div>
      </div>
    </section>
  )
}
