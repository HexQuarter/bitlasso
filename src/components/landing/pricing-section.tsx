"use client"

import { useRef, useState } from "react"
import { Check, ArrowRight } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"
import { Button } from "../ui/button"

const included = [
  "Payment request page generation",
  "Client redemption flow: mint receipts & discount",
  "Self-custody funds settlement",
  "Support L402 programmatic access for agents",
  "Lightning-network payment oriented for instant settlement",
  "Spark liquidity integration"
]

const bundles = [
  { quantity: 1, price: 1.0, discount: 0, label: "Single" },
  { quantity: 25, price: 0.95, discount: 5, label: "Starter" },
  { quantity: 50, price: 0.9, discount: 10, label: "Pro" },
  { quantity: 100, price: 0.85, discount: 15, label: "Business" },
  { quantity: 200, price: 0.75, discount: 25, label: "Enterprise" },
]

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const [selectedBundle, setSelectedBundle] = useState(1)
  const selected = bundles.find(b => b.quantity === selectedBundle) || bundles[0]
  const totalPrice = (selected.price * selected.quantity).toFixed(2)

  return (
    <section id="pricing" className="relative overflow-hidden border-t border-border/40 bg-slate-50 px-6 py-32 sm:px-10 md:py-40 lg:px-16">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        {/* Asymmetric layout: heading left, card right */}
        <div className={`transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className={`mb-20 max-w-2xl transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <p className="mb-5 font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">Pricing</p>
            <h2 className="font-serif text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.1] tracking-tight text-foreground">
              Flat fee. No percentage tax.
            </h2>
            <p className="mt-6 max-w-md text-pretty text-lg leading-[1.7] text-muted-foreground">
              Buy payment request credits upfront at flat-fee bundles. Direct to your wallet. Everything included. No hidden costs.
            </p>
          </div>

          {/* Large price callout
            <div className="mt-12 flex items-baseline gap-3">
              <span className="font-serif text-[clamp(4rem,8vw,7rem)] font-normal leading-none tracking-tight text-foreground">~$1</span>
              <span className="text-[15px] text-muted-foreground">/ checkout</span>
            </div> */}
        </div>

        {/* Bundle selector and pricing cards */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          {/* Left: Bundle options */}
          <div className={`transition-all duration-1000 delay-100 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="mb-8">
              <p className="mb-4 font-mono text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">Select quantity</p>
              <div className="flex flex-col gap-3">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.quantity}
                    onClick={() => setSelectedBundle(bundle.quantity)}
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-300 px-5 py-4 text-left ${selectedBundle === bundle.quantity
                      ? "border-primary/20 bg-primary/10"
                      : "border-border/40 bg-background hover:border-border/60"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{bundle.quantity} checkouts</p>
                        <p className="text-sm text-muted-foreground">{bundle.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-foreground">${bundle.price.toFixed(2)}</p>
                        {bundle.discount > 0 && (
                          <p className="text-xs font-medium text-primary">{bundle.discount}% off</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Savings highlight */}
            {selected.discount > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-sm text-muted-foreground">You save</p>
                <p className="mt-1 font-mono text-lg font-semibold text-primary">
                  ${((1.0 - selected.price) * selected.quantity).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Right: Pricing summary card */}
          <div className={`overflow-hidden rounded-2xl border border-border/40 bg-background transition-all duration-1000 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            {/* Summary */}
            <div className="border-b border-border/40 px-8 py-8 md:px-10">
              <div className="mb-8 space-y-2">
                <p className="text-sm text-muted-foreground">Order summary</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-foreground flex flex-col">{selected.quantity} <span className="text-sm text-muted-foreground font-light italic">payment checkouts</span></span>
                </div>
              </div>

              <div className="space-y-3 py-6 border-y border-border/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selected.quantity} × ${selected.price.toFixed(2)}</span>
                  <span className="font-mono font-semibold text-foreground">${totalPrice}</span>
                </div>
                {selected.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount ({selected.discount}%)</span>
                    <span className="font-mono font-semibold text-primary">-${((1.0 - selected.price) * selected.quantity).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-serif text-[clamp(2rem,5vw,3rem)] font-normal leading-none tracking-tight text-foreground">
                  ${totalPrice}
                </p>
              </div>
            </div>
            <div className="px-8 py-5">
              {/* Feature list card */}
              <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">Everything included</p>
              <div className="flex flex-col gap-5 mt-4">
                {included.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2`}
                  >
                    <div className="flex p-1 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Button
                  onClick={() => window.open('/#/app')}
                  className="w-full group flex items-center justify-center rounded-full bg-foreground font-medium text-background transition-all duration-300 hover:shadow-lg hover:shadow-foreground/10"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </div>


        </div>
      </div>
    </section>
  )
}
