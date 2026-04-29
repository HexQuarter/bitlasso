"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router";

function AnimatedNumber({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
    const [value, setValue] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0
                    const duration = 1400
                    const startTime = performance.now()
                    const animate = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1)
                        const eased = 1 - Math.pow(1 - progress, 4)
                        start = Math.round(eased * target)
                        setValue(start)
                        if (progress < 1) requestAnimationFrame(animate)
                    }
                    requestAnimationFrame(animate)
                    observer.disconnect()
                }
            },
            { threshold: 0.5 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [target])

    return <span ref={ref}>{prefix}{value}{suffix}</span>
}

export function HeroSection() {
    return (
        <section className="relative min-h-[100svh] overflow-hidden">
            {/* Background accent line */}
            <div className="pointer-events-none absolute inset-y-0 left-[calc(50%-0.5px)] w-px bg-border/30" />

            <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[90rem] flex-col px-6 pt-28 pb-16 sm:px-10 lg:px-16">
                {/* Top area - Badge */}
                <div className="animate-fade-up opacity-0 pt-8">
                    <div className="inline-flex items-center gap-3 rounded-full border border-border/50 bg-card/60 px-5 py-2.5 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="font-mono text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase">Lightning-fast. Programmable. Autonomous.</span>
                    </div>
                </div>

                {/* Image preview - right side on lg screens */}
                <div className="animate-fade-up opacity-0 delay-200 absolute 2xl:right-0 right-40 top-1/2 hidden -translate-y-1/2 lg:block lg:w-1/3">
                    <div className="absolute overflow-hidden rounded-2xl border border-border/20 shadow-2xl z-110 top-20 left-30 w-1/2 ">
                        <img
                            src="/payment.png"
                            alt="Bitlasso Dashboard Preview"
                            className=""
                        />
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-border/20 shadow-2xl">
                        <img
                            src="/image.png"
                            alt="Bitlasso Dashboard Preview"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>

                {/* Center - Main headline */}
                <div className="animate-fade-up opacity-0 delay-100 my-auto flex flex-col items-start mt-10">
                    <h1 className="max-w-5xl lg:max-w-4xl font-serif text-[clamp(3rem,8vw,8.5rem)] lg:text-[clamp(3rem,4vw,8.5rem)] font-normal leading-[0.95] tracking-[-0.02em] text-foreground">
                        Turn work into
                        <br />
                        <span className="italic text-primary">repeating</span>
                        <br />revenue—instantly
                    </h1>

                    <p className="mt-8 max-w-lg text-pretty text-lg leading-[1.7] text-muted-foreground lg:mt-10 lg:text-xl">
                        Self-custodial wallet with Lightning checkout and loyalty. Built for humans and machines.
                    </p>

                    <div className="animate-fade-up opacity-0 delay-200 right-0 top-1/2 lg:hidden -translate-y-1/2 ">
                        <div className="relative overflow-hidden rounded-2xl border border-border/20 shadow-2xl z-110 top-80 left-20 w-1/2 ">
                            <img
                                src="/payment.png"
                                alt="Bitlasso Dashboard Preview"
                                className=""
                            />
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/20 shadow-2xl">
                            <img
                                src="/image.png"
                                alt="Bitlasso Dashboard Preview"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>

                    <div className="lg:mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                            to="/app"
                            className="group inline-flex items-center gap-3 rounded-full bg-foreground px-8 py-4 text-[15px] font-medium text-background transition-all duration-300 hover:shadow-lg hover:shadow-foreground/10"
                        >
                            Start building today
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="#how-it-works"
                            className="inline-flex items-center gap-2 px-4 py-4 text-[15px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
                        >
                            See how it works
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Bottom - Stats strip */}
                <div className="animate-fade-up opacity-0 delay-500 mt-auto">
                    <div className="flex flex-col gap-8 border-t border-border/40 pt-8 sm:flex-row sm:items-baseline sm:gap-16 md:gap-24">
                        {[
                            { value: 1, prefix: "~$", suffix: "", label: "Per checkout" },
                            { value: 10, prefix: "<", suffix: "s", label: "Lightning settlement" },
                            { value: 100, prefix: "", suffix: "%", label: "Self-custodial" },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <p className="font-mono text-4xl font-medium tracking-tight text-foreground md:text-5xl">
                                    <AnimatedNumber target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                                </p>
                                <p className="mt-1.5 text-[13px] tracking-wide text-muted-foreground/60">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
