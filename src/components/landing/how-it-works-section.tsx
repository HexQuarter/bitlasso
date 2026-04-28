"use client"

import { useRef, useState } from "react"
import { FileText, Zap, Award, RotateCcw } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

// import PaymentRequest from '../../../public/payment_request.png'
// import PaymentCertificate from '../../../public/certificate.png'
// import Dashboard from '../../../public/dashboard.png'
// import Redeeem from '../../../public/redeem_screenshot.png'
import { MyPlayer } from "./video-player"

import CreatePaymentRequestVideo from '../../../public/create_payment_request.mp4'
import PayVideo from '../../../public/pay.mp4'
import MintCredisVideo from '../../../public/mint_credits.mp4'
import RedeemCreditsVideo from '../../../public/redeem_credits.mp4'


const steps = [
  {
    icon: FileText,
    title: "Create a payment request",
    description: "Generate a payment invoice for your client. Link it to a specific project, milestone, or deliverable.",
    // img: PaymentRequest,
    video: CreatePaymentRequestVideo
  },
  {
    icon: Zap,
    title: "Payment settles instantly",
    description: "Your client pays over Lightning network for an instant payment rail and secure settlement.",
    // img: PaymentCertificate,
    video: PayVideo
  },
  {
    icon: Award,
    title: "Mint an earned credit",
    description: "After work is completed, issue a self-custodial token to your client. It represents earned value from real work.",
    // img: Dashboard,
    video: MintCredisVideo

  },
  {
    icon: RotateCcw,
    title: "Client redeems later",
    description: "When the client returns for new work, they redeem their earned credits. Simple, transparent, self-sovereign.",
    // img: Redeeem,
    video: RedeemCreditsVideo
  },
]


export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const [selected, setSelected] = useState(0)

  return (
    <section id="how-it-works" className="relative overflow-hidden border-t border-border/40 bg-white px-6 py-32 sm:px-10 md:py-40 lg:px-16">
      <div ref={ref} className="mx-auto max-w-[90rem]">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className={`transition-all duration-1000 ${isInView ? "translate-y-0 opacity-50" : "translate-y-8 opacity-0"}`}>
            <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-primary uppercase">How it works</p>
          </div>
          <div className={`transition-all duration-1000 delay-100 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <h2 className="max-w-2xl font-serif text-[clamp(2rem,4.5vw,3.75rem)] font-normal leading-[1.1] tracking-tight text-foreground">
              Four steps. No complexity.
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
              From invoice to earned credit in a straightforward flow that respects your time and your client's sovereignty.
            </p>
          </div>
        </div>

        <div className={`flex gap-10 mt-10 not-sm:hidden transition-all duration-1000 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="flex flex-col gap-2">
            {steps.map((item, i) => (
              <div className={`bg-gray-50 flex px-5 py-5 items-center gap-5 rounded-lg transition hover:cursor-pointer ${selected == i ? 'bg-primary/10 text-primary border border-primary/20 ' : 'text-foreground shadow-sm hover:bg-primary/10 hover:scale-102 '}`} key={i} onClick={() => setSelected(i)}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl p-3 rounded-full text-primary ${selected == i ? 'bg-white' : 'bg-primary/10'}`}>
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="tracking-tight text-lg font-medium">{item.title}</h3>
                  <p className={`mt-3 max-w-sm text-[15px] leading-[1.7]  ${selected == i ? 'text-foreground' : 'text-muted-foreground'}`}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex">
            <div>
              <MyPlayer src={steps[selected].video} />
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex flex-col gap-5">
            {steps.map((item, i) => (
              <div className={`bg-gray-50 flex px-5 py-5 gap-5 rounded-lg flex-col`} key={i}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl p-3 rounded-full text-primary bg-primary/10`}>
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="tracking-tight text-lg font-medium">{item.title}</h3>
                </div>
                <div>
                  <MyPlayer src={item.video} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
