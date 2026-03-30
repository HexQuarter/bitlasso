import type { PaymentRequest } from "@/lib/nostr"
import { shortenAddress } from "@/lib/utils"

import { useEffect, useMemo, useState } from "react"

import { ExternalLink, QrCode, Timer } from "lucide-react"
import { TbTransactionBitcoin } from "react-icons/tb";

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
        <div className="flex flex-col gap-2">
            <div className="text-sm flex flex-col gap-5">
                <div className="flex justify-between gap-1">
                    <p className="text-lg font-medium text-xl font-serif">Certificate</p>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground/60 text-xs font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Date
                    </p>
                    <p className="">{btcAmountDate?.toDateString()}</p>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground/60 text-xs font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Payment mode
                    </p>
                    <p className="">{mode}</p>
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground/60 text-xs font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                        <TbTransactionBitcoin className="h-4 w-4" />
                        Transaction
                    </p>
                    <a href={txUrl} target="_blank" className="flex items-center gap-2">
                        {shortenAddress(paymentRequest.settleTx as string)}
                        <ExternalLink className="h-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}