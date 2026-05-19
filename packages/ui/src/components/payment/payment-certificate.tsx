import type { PaymentRequest } from "@bitlasso/sdk"
import { shortenAddress } from "@/lib/utils"

import { useMemo } from "react"

import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export const PaymentCertificate: React.FC<{ paymentRequest: PaymentRequest, btcAmountDate: Date }> = ({ paymentRequest, btcAmountDate }) => {
    const txUrl = useMemo(() => `https://sparkscan.io/tx/${paymentRequest.settleTx}`, [paymentRequest])

    const copy = (address: string) => {
        navigator.clipboard.writeText(address)
        const toastId = toast.info('Invoice copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs text-neutral-400 uppercase tracking-widest font-light">Payment certificate</span>
            <div className="text-sm flex flex-col gap-5 mt-10">
                <div className="grid lg:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-neutral-500">
                            Date
                        </p>
                        <p className="font-semibold">{btcAmountDate?.toDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-neutral-500">
                            Transaction
                        </p>
                        <a href={txUrl} target="_blank" className="flex items-center gap-2 font-semibold">
                            {shortenAddress(paymentRequest.settleTx as string)}
                            <ExternalLink className="h-4" />
                        </a>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex bg-gray-50 border rounded-lg px-3 py-2">
                        <div className="text-xs text-neutral-700 p-2 flex flex-col gap-5">
                            <span className="text-muted-foreground/80">Lightning invoice</span>
                            <span className="font-mono break-all ">{paymentRequest.lightningInvoice}</span>
                            <button
                                className="text-neutral-500 hover:text-black flex items-center gap-2"
                                onClick={() => copy(paymentRequest.lightningInvoice)}>
                                <Copy size={16} className="text-primary" /> Click to copy the full invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}