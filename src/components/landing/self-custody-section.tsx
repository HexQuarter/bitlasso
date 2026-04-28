"use client"

import { useRef } from "react"
import { KeyRound, ShieldCheck, Lock, Fingerprint } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const facts = [
  { icon: ShieldCheck, title: "Bitcoin-secured", text: "Assets are secured by Bitcoin and Lightning's network security - while using Spark for ease of the liquidity." },
  { icon: KeyRound, title: "Your identity", text: "Powered by Nostr — you own your identity, not a platform" },
  { icon: Fingerprint, title: "Wallet-bound", text: "Once created, receipt tokens are associated to your wallet" },
  { icon: Lock, title: "Zero access", text: "We don't and we can't have access to your funds" },
]

export function SelfCustodySection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="self-custody" className="relative border-t border-border/40 px-6 py-32 sm:px-10 md:py-40 lg:px-16">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        {/* Full-width dramatic heading */}
        <div className={`mb-20 transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <p className="mb-5 font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">Self-custodial</p>
          <div className="flex flex-col gap-6">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.25rem)] font-normal leading-[1.05] tracking-tight text-foreground">
              <span className="text-primary">Your</span> keys. <br /><span className="text-primary">Your</span> clients. <br /><span className="text-primary">Your</span> business.
            </h2>
            <p className=" text-pretty text-lg leading-[1.7] text-muted-foreground">
              With a self-custodial wallet, you remain in control with total ownership. You are the sole owner of your assets.
            </p>
          </div>
        </div>

        {/* Single-row cards with visual connector */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact, i) => (
            <div
              key={fact.title}
              className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all duration-700 hover:border-border/80 hover:shadow-lg ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
              style={{ transitionDelay: isInView ? `${400 + i * 100}ms` : "0ms" }}
            >
              {/* Background accent */}
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-accent/[0.03]" />

              <div className="relative">
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                  <fact.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[15px] font-semibold tracking-tight text-card-foreground">{fact.title}</p>
                <p className="mt-2 text-[14px] leading-[1.7] text-muted-foreground">{fact.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
