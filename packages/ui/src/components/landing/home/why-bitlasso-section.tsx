"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Coins, Hammer, Repeat, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react"

const problems = [
  {
    title: "Custody breaks the model",
    description: "Most platforms hold your funds, reintroducing intermediaries and counterparty risk.",
  },
  {
    title: "Fees scale with your success",
    description: "1–2% per transaction disappears as revenue grows. Bitcoin becomes expensive exactly when you succeed.",
  },
  {
    title: "No native retention layer",
    description: "Repeat payments, incentives, and loyalty flows require external systems and manual infrastructure.",
  },
  // {
  //   title: "No programmable checkout layer",
  //   description: "Bitcoin is money, not an execution layer. You can’t embed payment logic directly into APIs or services.",
  // },
]

const differentiators = [
  {
    icon: Sparkles,
    title: "Instant payments",
    description: "Receive Bitcoin payments globally in seconds.",
  },
  {
    icon: Hammer,
    title: "Built-In Rewards",
    description: "Turn one-time payments into repeat customer behavior.",
  },
  {
    icon: Hammer,
    title: "Merchant Ownership",
    description: "Own your funds and customer relationships.",
  },
]

export function WhyBitlassoSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="problem" className="relative border-t border-border/40 px-6 py-32 sm:px-10 md:py-40 lg:px-16 bg-white">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        <div className="grid gap-20">
          <div className="space-y-10">
            <div className={`transition-all duration-1000 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
              <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">Why Bitlasso ?</p>
            </div>
            <div className={`transition-all duration-1000 delay-100 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
              <h2 className="font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight">
                Every payment should create future revenue.
              </h2>
              {/* <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
                Lower fees, global reach, aligned with the agentic future. But custody, fees, and zero programmability kill the Bitcoin promise.
              </p> */}
            </div>

            {/* Bento grid - varied card sizes */}
            <div className="mt-20 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {problems.map((problem, i) => {
                return (
                  <div
                    key={problem.title}
                    className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-all duration-700 hover:border-border/80 hover:shadow-lg md:p-10 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 font-serif text-[8rem] font-bold leading-none text-primary/5">
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

            <p className="text-center text-3xl font-semibold tracking-tight text-primary"><span className="text-black">Traditional payment systems stop at the transaction. </span><br />Bitlasso turns payments into repeat customer infrastructure.</p>



            <div className="flex flex-col gap-10 mx-auto mt-24 bg-primary/5 border border-primary/10 p-10 rounded-xl shadow-xl items-center">

              <div className="flex flex-col lg:flex-row gap-20">


                <div className="flex flex-col gap-5 pt-10 pb-10">
                  {differentiators.map((item, i) => (
                    <div className="flex gap-5 bg-white shadow-lg p-5 rounded-lg items-center" key={i}>
                      <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <h3 className="font-semibold tracking-tight text-foreground">
                          {item.title}
                        </h3>

                        <p className="text-[15px] leading-[1.8] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">Retention</p>
                  <div className="relative flex md:flex-row items-center justify-center gap-2">
                    {/* LEFT CIRCLE */}
                    <div className="relative h-[10rem] w-[10rem] rounded-full bg-primary">

                      {/* Ring */}
                      <div className="absolute inset-2 rounded-full border bg-white" />

                      {/* Center */}
                      <div className="absolute left-1/2 top-1/2 flex h-35 w-35 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full shadow-sm">
                        <Coins className="mb-4 h-10 w-10 text-primary" />

                        <p className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                          Payments
                        </p>
                      </div>
                    </div>

                    {/* RIGHT CIRCLE */}
                    <div className="relative h-[10rem] w-[10rem] rounded-full left-[-40px]">

                      {/* Ring */}
                      <div className="absolute inset-0 rounded-full border-10 border-black " />

                      {/* Center */}
                      <div className="absolute left-1/2 top-1/2 flex h-35 w-35 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white/80 shadow-sm">
                        <ShieldCheck className="mb-4 h-10 w-10 text-primary" />

                        <p className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                          Reward
                        </p>
                      </div>


                    </div>
                  </div>
                </div>

                <div className="flex flex-col p-2 rounded-3xl bg-white shadow-lg p-10 gap-5">
                  <p className="font-normal text-center font-serif text-3xl">Built for recurring Bitcoin revenue</p>
                  <div className="flex flex-col gap-5">
                    {[
                      {
                        title: "Free",
                        description:
                          "No revenue cuts.",
                        icon: Coins,
                      },
                      {
                        title: "Retention Built-In",
                        description:
                          "Reward repeat customers automatically.",
                        icon: Repeat,
                      },
                      {
                        title: "Automation Ready",
                        description:
                          "Trigger webhooks and recurring workflows.",
                        icon: Workflow,
                      },
                      {
                        title: "Lightning Native",
                        description:
                          "Fast global settlement with Bitcoin.",
                        icon: Zap,
                      }
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-2 flex gap-5 items-center"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex flex-col">
                          <h4 className="text-base font-semibold text-foreground">
                            {item.title}
                          </h4>

                          <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


              </div>

              <div className="mt-14 flex justify-center">
                <div className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-lg">
                  <p className="text-sm text-muted-foreground">
                    Built for commerce
                    <span className="ml-1 font-medium text-primary">
                      - not speculation.
                    </span>
                  </p>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  )
}
