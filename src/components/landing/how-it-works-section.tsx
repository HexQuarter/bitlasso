"use client"

import { useRef, useState } from "react"
import { FileText, Zap, Award, RotateCcw } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"


import CreatePaymentRequest from '../../../public/create_payment_request.png'
import Carbon from '../../../public/carbon.png'
import PaymentCertificate from '../../../public/payment_cert.png'
import MintCredits from '../../../public/mint_credit.png'
import Redeeem from '../../../public/redeem2.jpg'
import { MyPlayer } from "./video-player"

const steps = [
  {
    icon: FileText,
    title: "Create a payment request",
    description: "Generate via UI or API. Link to project/milestone. Set which tokens to issue. Configure webhook for automated token minting.",
    img: CreatePaymentRequest,
    img2: Carbon,
  },
  {
    icon: Zap,
    title: "Payment settles instantly",
    description: "Client pays over Lightning Network. <2 second settlement. Your webhook fires with cryptographic proof. Email/Nostr/webhook notification per config.",
    img: PaymentCertificate,
  },
  {
    icon: Award,
    title: "Mint an earned credit",
    description: "Issue self-custodial token manually (today) or via webhook automation. Represents earned value from completed work.",
    img: MintCredits,

  },
  {
    icon: RotateCcw,
    title: "Drive repeat revenue",
    description: "Clients redeem tokens for discounts on future payments, increasing retention and automating loyalty at scale.",
    img: Redeeem,
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
              Quick & easy. From invoice to credits.
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-[1.7] text-muted-foreground">
              From invoice to earned credit in a straightforward Lightning flow that respects your time and your client's sovereignty.
            </p>
          </div>
        </div>

        <div className={`flex gap-20 mt-10 not-sm:hidden transition-all duration-1000 delay-200 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="w-1/2 flex justify-center items-center relative">
            {steps[selected].img2 &&
              <div className="rounded-2xl border border-border/20 shadow-2xl absolute z-10 left-60 bottom-10">
                <img src={steps[selected].img2} className="rounded-sm" />
              </div>
            }
            <div className={`rounded-2xl border border-border/20 shadow-2xl ${steps[selected].img2 ? 'w-1/2' : 'w-[70%]'}`}>
              <img src={steps[selected].img} className="rounded-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-1/2">
            {steps.map((item, i) => (
              <div className={`flex px-5 py-5 items-center gap-5 transition hover:cursor-pointer border-0 border-l-3 ${selected == i ? 'text-primary  border-l-primary' : 'text-foreground'}`} key={i} onClick={() => setSelected(i)}>
                <div className={`flex h-15 w-15 items-center justify-center rounded-2xl p-3 rounded-full text-primary ${selected == i ? 'bg-primary' : 'bg-white'}`}>
                  <item.icon className={`h-5 w-5  ${selected == i ? 'text-white' : 'text-primary'}`} />
                </div>
                <div className="flex flex-col">
                  <h3 className="tracking-tight text-lg font-medium">{item.title}</h3>
                  <p className={`mt-3 max-w-sm text-[15px] leading-[1.7]  ${selected == i ? 'text-foreground' : 'text-muted-foreground'}`}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex flex-col gap-5">
            {steps.map((item, i) => (
              <div className={`bg-gray-50 flex px-5 py-5 gap-5 rounded-lg flex-col`} key={i}>
                <div className="flex items-center gap-2 relative">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl p-3 rounded-full text-primary bg-primary/10`}>
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="tracking-tight text-lg font-medium">{item.title}</h3>
                </div>
                <p className={`mt-3 max-w-sm text-[15px] leading-[1.7]  ${selected == i ? 'text-foreground' : 'text-muted-foreground'}`}>{item.description}</p>
                <div className="flex justify-center items-center flex-col">
                  <div className={`rounded-2xl border border-border/20 shadow-2xl `}>
                    <img src={item.img} className="rounded-sm" />
                  </div>
                  {item.img2 &&
                    <div className=" border-t border-black/10 shadow-2xl mt-5 pt-5">
                      <img src={item.img2} className="rounded-sm" />
                    </div>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section >
  )
}
