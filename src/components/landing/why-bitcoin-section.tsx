import { useRef } from "react"
import { Shield, Globe, Clock, Lock } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const reasons = [
  {
    icon: Clock,
    title: "Subsecond settlement",
    description: "Lightning Network handles payments in <2 seconds. Your workflows trigger immediately, not days later.",
  },
  {
    icon: Globe,
    title: "Works across borders",
    description: "Open and programmable",
  },
  {
    icon: Shield,
    title: "Verifiable onchain",
    description: "Every transaction cryptographically signed. Build deterministic systems where the source of truth is immutable.",
  },
  {
    icon: Lock,
    title: "Non-custodial guarantees",
    description: "No platform holds your funds. Settlement is to your wallet directly. Your agents control the outcome.",
  },
]

const comparison = {
  traditional: ["Multi-day settlement", "Proprietary APIs", "Centralized failures", "Expensive webhooks"],
  bitlasso: ["<2 second settlement", "Open protocols (Nostr/Lightning)", "Decentralized & redundant", "Programmable by design"],
}

export function WhyBitcoinSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="why-bitcoin" className="relative border-t border-border/40 px-6 py-32 sm:px-10 md:py-40 lg:px-16 bg-slate-50">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        {/* Full-width header */}
        <div className={`mb-24 transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <p className="mb-5 font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">Why Bitcoin</p>
          <h2 className="max-w-4xl font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight text-black ">
            Lightning beats traditional payments
          </h2>
        </div>

        {/* Comparison table - full bleed card */}
        <div className={`mb-20 overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-1000 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-border/40 p-8 md:border-r md:border-b-0 md:p-12">
              <p className="mb-8 font-mono text-[10px] font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">Traditional systems</p>
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
              <p className="mb-8 font-mono text-[10px] font-medium tracking-[0.2em] text-primary uppercase">bitlasso</p>
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

        {/* Feature cards - 2x2 bento with varying heights */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-16">
          {reasons.map((reason, i) => {
            const spans = ["lg:col-span-4", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4"]
            return (
              <div
                key={reason.title}
                className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all duration-700 hover:border-border/80 hover:shadow-lg md:p-10 ${spans[i]} ${isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                style={{ transitionDelay: isInView ? `${500 + i * 120}ms` : "0ms" }}
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                  <reason.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-card-foreground md:text-xl">{reason.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-muted-foreground">{reason.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
