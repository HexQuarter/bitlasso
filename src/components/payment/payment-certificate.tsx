import type { PaymentRequest } from "@/lib/nostr"
import { shortenAddress } from "@/lib/utils"

import { useEffect, useMemo, useState } from "react"

import { ExternalLink } from "lucide-react"

export const PaymentCertificate: React.FC<{ paymentRequest: PaymentRequest, btcAmountDate?: Date }> = ({ paymentRequest, btcAmountDate }) => {
    const txUrl = useMemo(() => {
        if (paymentRequest.settlementMode == 'btc') {
            return `https://www.blockchain.com/explorer/transactions/btc/${paymentRequest.settleTx}`
        }
        return `https://sparkscan.io/tx/${paymentRequest.settleTx}`
    }, [paymentRequest])

    const [mode, setMode] = useState("Spark")

    useEffect(() => {
        if (paymentRequest.settlementMode == 'spark') {
            fetch(`https://api.sparkscan.io/v1/tx/${paymentRequest.settleTx}`)
                .then(async (r) => {
                    if (!r.ok) {
                        setMode('Spark')
                    }
                    const { type } = await r.json()
                    if (type == 'lightning_payment') {
                        setMode("Lightning payment")
                    } else {
                        setMode('Spark')
                    }
                })
        }
        else {
            setMode('Bitcoin')
        }
    }, [paymentRequest])

    return (
        <div className="flex flex-col gap-2 items-center">
            <div className="text-sm flex flex-col gap-5 items-center">
                <div className="flex flex-col gap-2 items-center">
                    <p className="text-sm text-neutral-500">
                        Date
                    </p>
                    <p className="font-semibold">{btcAmountDate?.toDateString()}</p>
                </div>
                <div className="flex flex-col gap-2 items-center">
                    <p className="text-sm text-neutral-500">
                        Payment mode
                    </p>
                    <p className="font-semibold">{mode}</p>
                </div>
                <div className="flex flex-col gap-2 items-center">
                    <p className="text-sm text-neutral-500">
                        Transaction
                    </p>
                    <a href={txUrl} target="_blank" className="flex items-center gap-2 font-semibold">
                        {shortenAddress(paymentRequest.settleTx as string)}
                        <ExternalLink className="h-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}