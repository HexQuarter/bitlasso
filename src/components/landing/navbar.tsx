"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"

const links = [
    { label: "Problem", href: "#problem" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Real Rewards", href: "#why-bitcoin" },
    // { label: "oRWA", href: "#orwa" },
    // { label: "Decentralized", href: "#decentralized" },
    // { label: "Self-custodial", href: "#self-custody"},
    { label: "Pricing", href: "#pricing" },
]

import LogoPng from '../../../public/logo.svg'
import { Link } from "react-router"

export function Navbar() {
    const [open, setOpen] = useState(false)

    return (
        <header className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-[90rem] px-6 pt-5 sm:px-10 lg:px-16">
                <nav className="flex items-center justify-between rounded-full px-6 py-3 shadow-sm backdrop-blur-lg sm:px-8 bg-transparent">
                    <div className="font-serif tracking-tight text-foreground flex items-center gap-2">
                        <img src={LogoPng} className='w-10' />
                        <div className='font-serif tracking-tighter text-foreground flex items-center'>
                            <p className="flex gap-2 items-end">
                                <a className="text-4xl" href='#'>
                                    <span className="text-primary">bit</span>lasso
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-1 md:flex">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                to={l.href}
                                className="rounded-full px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-primary hover:text-foreground"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    <Link
                        to="/app"
                        className="hidden rounded-full bg-foreground px-6 py-2 text-[13px] font-medium text-background transition-all duration-300 hover:opacity-85 md:inline-flex"
                    >
                        Build your loop
                    </Link>

                    <button
                        className="flex items-center justify-center text-foreground md:hidden"
                        onClick={() => setOpen(!open)}
                        aria-label={open ? "Close menu" : "Open menu"}
                    >
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-primary" />}
                    </button>
                </nav>
            </div>

            {open && (
                <div className="mx-6 mt-2 rounded-2xl border border-border/40 bg-card/95 p-6 shadow-lg backdrop-blur-2xl sm:mx-10 md:hidden lg:mx-16">
                    <div className="flex flex-col gap-1">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                to={l.href}
                                onClick={() => setOpen(false)}
                                className="rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                                {l.label}
                            </Link>
                        ))}
                        <Link
                            to="/app"
                            onClick={() => setOpen(false)}
                            className="mt-2 rounded-full bg-foreground px-6 py-3 text-center text-sm font-medium text-background"
                        >
                            Build your loop
                        </Link>
                    </div>
                </div>
            )}
        </header>
    )
}
