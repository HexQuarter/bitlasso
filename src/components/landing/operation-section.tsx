"use client"

import { useRef } from "react"
import { FileCheck, Handshake, ShieldCheck } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const receipts = [
  { icon: FileCheck, label: "Proof that work was completed" },
  { icon: Handshake, label: "Proof that value was delivered" },
  { icon: ShieldCheck, label: "Proof that trust was earned" },
]

const facts = [
  "Not securities, financial instruments, or speculative assets",
  "Bitcoin received is fully retained by merchants",
  "Issuance rules and redemption terms are merchant-defined",
  "Built for repeat business and agent-driven automation",
  "Powered by Lightning + Nostr for decentralized, programmable infrastructure",
]

export function OperationalSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="orwa" className="relative overflow-hidden border-t border-border/40  bg-slate-50 px-6 py-32 sm:px-10 md:py-40 lg:px-16">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        {/* Large typographic statement */}
        <div className={`mb-24 transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <p className="mb-5 font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">Operational, not speculation.</p>
          <h2 className="max-w-4xl font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight text-foreground">
            This is a payments tool, not a token market
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
            Tokens are operational receipts—proof of work, value, and trust. You can automate the entire lifecycle. No speculation. Pure utility.
          </p>
        </div>

        {/* Bento layout: 3 proof cards + 1 large facts card */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Proof cards - stacked column */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {receipts.map((item) => (
              <div
                key={item.label}
                className={`group flex items-center gap-6 h-full rounded-2xl border border-border/40 bg-background p-6 transition-all duration-700 hover:border-border/80 hover:shadow-lg md:p-8 ${isInView ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0"}`}
                style={{ transitionDelay: isInView ? `10ms` : "0ms" }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[15px] font-medium text-foreground md:text-base">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Facts card - tall, spanning the right */}
          <div
            className={`overflow-hidden rounded-2xl border border-border/40 bg-background lg:col-span-7 transition-all duration-1000 delay-300 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
          >
            <div className="border-b border-border/40 px-8 py-5 md:px-10 md:py-6">
              <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">What this means in practice</p>
            </div>
            <div className="flex flex-col">
              {facts.map((fact, i) => (
                <div
                  key={fact}
                  className={`flex items-start gap-4 px-8 py-5 md:px-10 md:py-6 ${i < facts.length - 1 ? "border-b border-border/20" : ""}`}
                >
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[15px] leading-[1.7] text-foreground/80">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
