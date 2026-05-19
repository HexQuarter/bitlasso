import { Client, fetchEarnRequest, parseLightningInvoiceAmount, RelayConfig, subscribePayment, type PaymentRequest } from "@bitlasso/sdk";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { LoyaltySection } from "./loyalty-section";
import { Slider } from "../ui/slider";
import { formatTime } from "@/lib/utils";
import { CheckCircle, Copy } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { getProviders } from "sats-connect";

export type PaymentConfirmation = { transaction: string, settlementMode: string, btcAmount: number }

export const PaymentForm: React.FC<{ relayConfig: RelayConfig, paymentRequest: PaymentRequest, handleConfirmation: (confirmation: PaymentConfirmation) => void }> = ({ relayConfig, paymentRequest, handleConfirmation }) => {
    const [remainingRefreshTime, setRemainingRefreshTime] = useState(0)
    const [btcAmount, setBtcAmount] = useState(0)
    const [lightningInvoice, setLightningInvoice] = useState<string>(paymentRequest.lightningInvoice)

    const [redeemDetails, setRedeemDetails] = useState<{ redeemAmount: number, redeemTransaction: string } | undefined>(paymentRequest.redeemTx ? { redeemAmount: paymentRequest.redeemAmount as number, redeemTransaction: paymentRequest.redeemTx as string } : undefined)
    const maxRedeemable = !redeemDetails ? paymentRequest.amount * (paymentRequest.discountRate / 100) : 0
    const maxRedeemableToken = Math.floor(Math.max(0, maxRedeemable))
    const [sparkAddress, setSparkAddress] = useState<undefined | string>(undefined)
    const [copied, setCopied] = useState(false);
    const [availableWallet, setAvailableWallet] = useState<boolean>(false)

    const refreshBtc = async (paymentRequestId: string) => {
        const api = new Client({ dev: import.meta.env.DEV });
        const response = await api.getPaymentPrice(paymentRequestId)
        if (response) {
            const { btc, endtime, lightningInvoice } = response
            setBtcAmount(btc)
            if (lightningInvoice) {
                setLightningInvoice(lightningInvoice)
            }

            const dateNow = Date.now()
            const remainingSecs = Math.floor((endtime - dateNow) / 1000)
            setRemainingRefreshTime(remainingSecs)
            return remainingSecs
        } else {
            const btcFromInvoice = parseLightningInvoiceAmount(lightningInvoice)
            if (!btcFromInvoice) {
                return
            }

            setBtcAmount(btcFromInvoice)
            setRemainingRefreshTime(0)
        }
    }

    const copy = (address: string) => {
        navigator.clipboard.writeText(address)
        const toastId = toast.info('Invoice copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
        setCopied(true)
    }

    const handleSparkAddress = (value: string) => {
        setSparkAddress(value)
    }

    useEffect(() => {
        const response = getProviders()
        if (response.length > 0) {
            setAvailableWallet(true)
        }

        fetchEarnRequest(relayConfig, paymentRequest.id).then((earnRequest) => {
            if (earnRequest) {
                setSparkAddress(earnRequest.sparkAddress)
            }
        })

        subscribePayment(relayConfig, paymentRequest.id, (transaction: string, settlementMode: string) => {
            handleConfirmation({ transaction, settlementMode, btcAmount })
        })

        if (remainingRefreshTime > 0) {
            new Promise((r) => setTimeout(r, 1000)).then(() => setRemainingRefreshTime(prev => prev - 1))
        }
        else {
            refreshBtc(paymentRequest.id)
        }
    }, [paymentRequest, remainingRefreshTime])

    useEffect(() => {
        if (!sparkAddress || sparkAddress == '') return

        setTimeout(async () => {
            try {
                const client = new Client({ dev: import.meta.env.DEV });
                await client.publishEarnRequest(
                    paymentRequest.id,
                    sparkAddress
                );
            } catch (error) {
                console.error("Failed to publish earn request:", error);
            }
        }, 500); // Adjust delay as needed
    }, [sparkAddress])

    return (
        <div className="flex flex-col gap-10">
            <span className="text-xs text-neutral-400 uppercase tracking-widest font-light">Payment request</span>
            <div className="flex justify-center">
                <QRCode value={paymentRequest.lightningInvoice} />
            </div>
            <div className="flex flex-col">

                {(btcAmount == 0 || remainingRefreshTime == 0 || remainingRefreshTime == undefined) && <span className="flex justify-center items-center gap-2 text-xs text-muted-foreground"><Spinner /> Fetch Bitcoin price</span>}
                {remainingRefreshTime !== undefined && remainingRefreshTime > 0 &&
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 justify-between">
                            {btcAmount > 0 && remainingRefreshTime > 0 &&
                                <span className="text-muted-foreground text-sm text-center">Send <span className="font-semibold">{Math.floor(btcAmount * 100_000_000).toLocaleString()}</span> sats • {btcAmount} BTC</span>
                            }
                            <p className="text-xs text-muted-foreground">Expires in {formatTime(remainingRefreshTime)}</p>
                        </div>
                        <Slider max={60 * 5} min={0} value={[remainingRefreshTime > 0 ? 60 * 5 - remainingRefreshTime : 0]} className="" withThumb={false} />
                    </div>
                }
            </div>
            <div className="space-y-2">
                <div className="text-xs text-neutral-500">Scan or copy to pay the invoice</div>
                <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2">
                    <div className="text-xs text-neutral-700 break-all p-2 flex flex-col gap-5">
                        <span className="text-muted-foreground/80">Lightning invoice</span>
                        <span className="font-mono ">{lightningInvoice}</span>
                        <button
                            onClick={() => copy(lightningInvoice)}
                            className="text-neutral-500 hover:text-black"
                        >
                            {copied ? <div className="text-xs text-green-600 flex items-center gap-2"><CheckCircle size={16} /> Copied to clipboard </div> : <span className="flex items-center gap-2"><Copy size={16} className="text-primary" /> Click to copy the full invoice </span>}
                        </button>
                    </div>
                </div>
            </div>

            {paymentRequest.discountRate > 0 &&
                <div className="flex flex-col gap-2 bg-primary/5 rounded-lg border border-primary/30 p-5 text-xs">
                    <p className="font-semibold text-primary">Earn BITL</p>
                    <p className="text-muted-foreground">Every dollar you pay mints 1 BITL. <br />Spend it on discounts at any BitLasso merchant.</p>
                    <input placeholder="Enter your Spark address to receive 1 BIT: spark1..." className="p-2 border rounded-sm bg-white" value={sparkAddress} onChange={(e) => handleSparkAddress(e.target.value)} />
                    {<p className="text-xs text-muted-foreground">Don't have a Spark wallet, we recommand <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">XVerse</a> wallet.</p>}
                </div>
            }

            <div className="flex gap-2 justify-center">
                <Button onClick={() => window.open("lightning:" + lightningInvoice)}>
                    Pay with Lightning
                </Button>

                {maxRedeemableToken > 0 &&
                    <LoyaltySection
                        paymentRequest={paymentRequest}
                        handleRedeem={((transaction, amount) => setRedeemDetails({ redeemAmount: amount, redeemTransaction: transaction }))}
                        maxRedeemableToken={maxRedeemableToken}
                        availableWallet={availableWallet} />
                }
            </div>
        </div>
    )
}
