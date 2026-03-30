import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

import LogoPng from '../../../public/logo.svg'
import { CheckCircle2, MailIcon } from "lucide-react";
import type { PaymentRequest } from "@/lib/nostr";
import { PaymentRequestInfo } from "../payment/payment-request-info";
import { PaymentCertificate } from "./payment-certificate";

export const PaidRequest: React.FC<{ paymentRequest: PaymentRequest, btcAmount: number, btcAmountDate?: Date }> = ({ paymentRequest, btcAmount, btcAmountDate }) => {
    return (<div className="flex flex-col md:py-10">
        <Card className="flex flex-col gap-10 p-0 gap-0 shadow-xs not-sm:rounded-none">
            <CardHeader className='flex md:flex-row flex-col p-0! md:items-center justify-between border-b border-border/60 p-4!'>
                <div className="flex gap-2 items-center ">
                    <img src={LogoPng} className='w-8' />
                    <div className='font-serif text-2xl tracking-tight text-foreground flex items-center'>
                        <span className='text-primary'>bit</span>
                        lasso
                    </div>
                </div>
                <div className="not-sm:hidden text-xs text-center text-slate-600 flex items-center text-muted-foreground gap-2 flex-col group hover:cursor-pointer" onClick={() => location.href = 'mailto:bitlasso@hexquarter.com'}>
                    <div className="border border-primary/20 rounded-full p-2 group-hover:bg-primary/10 ">
                        <MailIcon className="h-3 w-3 text-primary " />
                    </div>
                    <span className="uppercase text-[10px] text-muted-foreground/80">PROBLEM ?</span>
                </div>
            </CardHeader>
            <CardContent className="flex md:flex-row flex-col">
                <div className="gap-5 p-0 flex-1 bg-white p-5 md:p-10 flex flex-col">
                    <div className="flex flex-col gap-10">
                        <div className="flex items-center gap-5 justify-between">
                            <h1 className="text-2xl">
                                <span className="text-primary">Payment</span> request
                            </h1>
                        </div>
                        <div className="flex flex-col gap-2 border-b border-t py-5 items-center">
                            <div className="flex items-center p-3 bg-green-600/20 rounded-full"><CheckCircle2 className="h-6 w-6 text-green-800" /></div>
                            <div className="flex">
                                <h1 className="text-xs text-green-600 uppercase bg-green-600/20 px-2 py-1 border border-green-600/10 rounded-full flex items-center gap-2 tracking-widest font-mono">
                                    <div className="h-2 w-2 bg-green-600 rounded"></div>
                                    Payment confirmation
                                </h1>
                            </div>

                            <p className="font-semibold">
                                The payment has been received.
                            </p>
                            <p className="">The merchant has been notified and will follow up shortly.</p>
                            <p className="italic mt-5">Thanks for using our service.</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Find payment details below</p>
                    </div>
                    <PaymentRequestInfo paymentRequest={paymentRequest} btcAmount={btcAmount} />
                </div>
                <div className="gap-10 p-0 flex-1 bg-primary/5 p-5 md:p-10 flex flex-col ">
                    <div className="flex flex-col gap-5">
                        <h2 className="text-2xl">
                            <span className="text-primary">Payment</span> method
                        </h2>
                    </div>
                    <div className="flex flex-col gap-5">
                        <p className="text-sm text-muted-foreground">Find payment details below</p>
                        <div className="p-5 bg-white backdrop-blur-sm rounded-xl ">
                            <PaymentCertificate paymentRequest={paymentRequest} btcAmountDate={btcAmountDate} />
                        </div>
                    </div>
                </div >
            </CardContent >
            <CardFooter className="flex justify-center p-5 border-t">
                <div className='text-xs text-muted-foreground'>© {new Date().getFullYear()} HexQuarter. All rights reserved.</div>
            </CardFooter>
        </Card >
    </div >)
}