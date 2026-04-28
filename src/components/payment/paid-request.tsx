import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

import LogoPng from '../../../public/logo.svg'
import { CheckCircle2 } from "lucide-react";
import type { OrgSettings, PaymentRequest } from "@/lib/nostr";
import { PaymentCertificate } from "./payment-certificate";

export const PaidRequest: React.FC<{ paymentRequest: PaymentRequest, btcAmount: number, btcAmountDate?: Date }> = ({ paymentRequest, btcAmount, btcAmountDate }) => {
    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className='flex items-center gap-2 hover:cursor-pointer justify-center mb-10' onClick={() => window.open('/?utm_source=bitlasso.xyz&utm_medium=payment_page', 'blank')} >
                    <img src={LogoPng} className='w-8' />
                    <div className='font-serif tracking-tighter text-foreground flex items-center'>
                        <p className="flex gap-2 items-end">
                            <span className="text-3xl"><span className="text-primary">bit</span>lasso</span>
                        </p>
                    </div>
                </div>
                <Card className="rounded-2xl shadow-sm border bg-white p-0 gap-0 shadow-xs not-sm:rounded-none">
                    <CardHeader className='flex flex-col p-0! md:items-center justify-between border-b border-border/60 p-4!'>
                        <span className="text-xs text-neutral-400">Payment confirmation for:</span>
                        <h1 className="text-lg text-muted-foreground">{paymentRequest.orgDetails ? (paymentRequest.orgDetails as OrgSettings).name : ''}</h1>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col gap-2 py-5 items-center">
                            <div className="flex items-center p-3 bg-green-600/20 rounded-full"><CheckCircle2 className="h-6 w-6 text-green-800" /></div>
                            <p className="font-semibold">
                                The payment has been received.
                            </p>
                            <p className="text-center text-sm">{paymentRequest.orgDetails ? (paymentRequest.orgDetails as OrgSettings).name : ''} has been notified and will follow up shortly.</p>
                            <p className="italic mt-5 text-xs">Payment details below:</p>
                        </div>
                        <div className="space-y-1 text-center">
                            <div className="text-sm italic">{paymentRequest.description || ''}</div>
                        </div>
                        <div className="space-y-1 text-center">
                            <div className="text-sm text-neutral-500">Amount</div>
                            <div className="text-3xl font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}</div>
                            <div className="text-xs text-neutral-400 flex justify-center flex-col">
                                {btcAmount > 0 &&
                                    `${Math.floor(btcAmount * 100_000_000)} sats • ${btcAmount} BTC`
                                }
                            </div>
                        </div>
                        <PaymentCertificate paymentRequest={paymentRequest} btcAmountDate={btcAmountDate} />
                    </CardContent>
                    <CardFooter className="justify-center flex flex-col gap-5 pb-2" >
                        <p className="text-center text-xs text-neutral-400">Encounter any problem? <a href="mailto:bitlasso@hexquarter.com" target="_blank" className="underline">Contact us</a></p>
                    </CardFooter>
                </Card>
                <p className="text-center mt-10 text-xs text-neutral-400">By <a href="https://hexquarter.com?utm_source=bitlasso.xyz&utm_medium=payment_page" target="_blank" className="underline">HexQuarter</a> - All rights reserved © {new Date().getFullYear()}</p>
            </div>
        </div>
    )
}