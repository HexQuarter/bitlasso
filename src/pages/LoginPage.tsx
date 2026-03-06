import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

import { PassphraseForm } from "@/components/app/passphrase-form";
import { CreateWalletForm } from "@/components/app/create-wallet-form";
import { useNavigate } from "react-router";
import { useWallet } from "@/hooks/use-wallet";
import { ArrowRight } from "lucide-react";

import LogoPng from '../../public/logo.svg'

export const LoginPage = () => {
    const { storeWallet } = useWallet()
    const [showPassphraseForm, setShowPassphraseForm] = useState(false)
    const [showCreateWalletForm, setShowCreateWalletForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handlePassphraseSubmit = async (mnemonic: string) => {
        setLoading(true)
        console.log('authenticating user...')

        await storeWallet(mnemonic)

        setLoading(false)
        navigate('/app/dashboard', { replace: true })
    }

    return (
        <div className="lg:grid lg:grid-cols-5 min-h-svh">
            {/* Left panel -- branding */}
            <div className="lg:col-1"></div>
            <div className="h-full fixed flex col-1 flex-col justify-between overflow-hidden bg-white p-12 hidden lg:flex">
                {/* Subtle grid pattern */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff601c' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0V0zm39 0h1v40h-1V0zM0 0h40v1H0V0zm0 39h40v1H0v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />

                {/* Logo */}
                <div className="relative z-10">
                    <div className='flex items-center gap-2'>
                        <img src={LogoPng} className='w-10' />
                        <div className='font-serif tracking-tighter text-foreground flex items-center'>
                            <p className="flex gap-2 items-end">
                                <span className="text-5xl"><span className="text-primary">bit</span>lasso</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center content */}
                <div className="relative z-10 max-w-md">
                    <p className="font-mono text-sm font-medium tracking-[0.2em] text-foreground/40 uppercase">
                        Business Dashboard
                    </p>
                    <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.02em] text-foreground">
                        Your checkout.
                        <br />
                        Your clients.
                        <br />
                        <span className="text-primary">Your business.</span>
                    </h1>
                    <p className="mt-6 text-base leading-relaxed text-foreground/50">
                        Manage payment requests, track earned credits, and build
                        lasting client relationships from a single dashboard.
                    </p>
                </div>

                {/* Bottom quote */}
                <div className="relative z-10">
                    <blockquote className="border-l-2 border-primary/40 pl-5">
                        <p className="text-sm italic leading-relaxed text-foreground">
                            {"\""}Bitcoin-native payments for the actual work.{"\""}
                        </p>
                    </blockquote>
                </div>
            </div>

            {/* Right panel -- form */}
            <div className="lg:col-2 lg:col-span-4 flex flex-1 items-center justify-center px-6 py-12 lg:px-12 bg-slate-50 min-h-screen">
                <div className="w-full max-w-lg lg:max-w-2xl">
                    {/* Mobile logo */}
                    <div className="mb-10 lg:hidden">
                        <a href="/" className="">
                            <div className='flex items-center justify-center gap-2'>
                                <img src={LogoPng} className='w-10' />
                                <div className='font-serif tracking-tighter text-foreground flex items-center'>
                                    <p className="flex gap-2 items-end">
                                        <span className="text-5xl"><span className="text-primary">bit</span>lasso</span>
                                    </p>
                                </div>
                            </div>
                        </a>
                    </div>

                    <Card className="w-full">
                        <CardContent>
                            {!showPassphraseForm && !showCreateWalletForm && <div className="flex flex-col gap-10 p-5 lg:p-20 ">
                                <div className="flex flex-col items-center gap-10 text-center ">
                                    <h1 className="w-full font-serif text-4xl font-normal text-foreground">
                                        Welcome !
                                    </h1>
                                    <h2 className="w-full font-serif text-2xl lg:text-3xl font-normal text-foreground">Access your <span className="text-primary">workspace</span></h2>
                                </div>
                                {!showPassphraseForm && !showCreateWalletForm &&
                                    <div className="flex flex-col lg:flex-row items-center justify-center gap-2">
                                        <button className="justify-center flex items-center gap-2 w-full rounded-full bg-foreground px-8 py-4 text-[15px] font-medium text-background transition-all duration-300 hover:shadow-lg hover:shadow-foreground/10 hover:bg-primary hover:cursor-pointer" onClick={() => setShowPassphraseForm(true)}>
                                            Connect wallet
                                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </button>
                                        <button className="justify-center flex items-center gap-2 w-full rounded-full bg-none text-primary px-8 py-4 text-[15px] font-medium text-background transition-all duration-300 hover:shadow-lg hover:border-primary border-1 hover:bg-primary/10 hover:shadow-foreground/10 hover:cursor-pointer" onClick={() => setShowCreateWalletForm(true)}>
                                            Create wallet
                                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </button>
                                    </div>
                                }
                                <p className="text-xs px-6 text-slate-400 text-center">Non-custodial. Your keys stay with you.</p>
                            </div>}
                            {showPassphraseForm &&
                                <PassphraseForm onSubmit={handlePassphraseSubmit} onBack={() => setShowPassphraseForm(false)} loading={loading} />
                            }
                            {showCreateWalletForm &&
                                <CreateWalletForm onSubmit={handlePassphraseSubmit} onBack={() => setShowCreateWalletForm(false)} loading={loading} />
                            }
                        </CardContent>
                    </Card>

                    <div className="mt-10 max-w-md lg:hidden text-center">
                        <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-foreground/40 uppercase">
                            Business Dashboard
                        </p>
                        <h1 className="mt-4 font-serif text-sm leading-[1.1] tracking-[-0.02em] text-foreground">
                            Your checkout.
                            Your clients.
                            <span className="text-primary ml-1">Your business.</span>
                        </h1>
                        <p className="mt-1 text-[11px] leading-relaxed text-foreground/50">
                            Bitcoin-native payments for the actual work.

                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}