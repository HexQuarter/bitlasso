import { type TabType } from "@/components/app/receive-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getPaymentPrice } from "@/lib/api"
import { shortenAddress, sparkBech32ToHex } from "@/lib/utils"
import { AlertCircle, CheckCircle2, ChevronDown, Copy, ExternalLink, Gift, Lock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import { usePostHog } from "@posthog/react";

import { AddressPurpose, getProviders, request, RpcErrorCode } from "sats-connect";
import { toast } from "sonner"

import LogoPng from '../../public/logo.svg'
import { fetchPaymentRequest, subscribePayment, subscribeRedeem, type PaymentRequest } from "@/lib/nostr"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { TabsContent, TabsTrigger } from "@radix-ui/react-tabs"
import QRCode from "react-qr-code"

import XVerseLogo from '../../public/xverse_logo.png'
import XVerseWhiteLogo from '../../public/xverse_white_logo.png'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { useSettings } from "@/hooks/use-settings"

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

export const PaymentPage: React.FC = () => {
    const { id } = useParams()
    const { settings } = useSettings()
    const posthog = usePostHog()
    const [loading, setLoading] = useState(true)

    const [paymentRequest, setPaymentRequest] = useState<undefined | PaymentRequest>(undefined)
    const [remainingRefreshTime, setRemainingRefreshTime] = useState(0)
    const [btcAmount, setBtcAmount] = useState(0)

    const [tokenBalance, setTokenBalance] = useState<undefined | { amount: number, name: string, decimals: number }>(undefined)
    const [redeemedTokens, setRedeemedTokens] = useState(0)
    const [alreadyRedeemedTokens, setAlreadyRedeemedTokens] = useState(0)
    const [wallet, setWallet] = useState<string | null>(null)
    const [availableWallet, setAvailableWallet] = useState<boolean>(false)
    const [fetchError, setFetchError] = useState<string>("")
    const [fetchErrorDetails, setFetchErrorDetails] = useState<string>("")
    const [loadingTokens, setLoadingTokens] = useState(false)

    const [redeemLoading, setRedeemLoading] = useState(false)
    const [redeeemError, setRedeemError] = useState<undefined | string>(undefined)

    const [sendLoading, setSendLoading] = useState(false)
    const [sendError, setSendError] = useState<undefined | string>(undefined)

    const [completed, setCompleted] = useState(false)
    const [paymentMade, setPaymentMade] = useState(false)
    const [paymentConfirmation, setPaymentConfirmation] = useState<undefined | { transaction: string, settlementMode: string }>(undefined)
    const [selectedPaymentTab, setSelectedPaymentTab] = useState("spark")
    const [paymentAddress, setPaymentAddress] = useState<undefined | string>(undefined)

    const ran = useRef(false);

    const refreshBtc = async (paymentRequestId: string) => {
        const response = await getPaymentPrice(paymentRequestId)
        if (!response) {
            return
        }
        const { btc, endtime } = response
        setBtcAmount(btc)

        const dateNow = Date.now()
        const remainingSecs = Math.floor((endtime - dateNow) / 1000)
        setRemainingRefreshTime(remainingSecs)
        return remainingSecs
    }

    useEffect(() => {
        if (!settings || ran.current) return;
        ran.current = true;

        if (id && !completed && !paymentRequest) {
            fetchPaymentRequest(settings, id).then(async (paymentRequest) => {
                setLoading(false)
                setPaymentRequest(paymentRequest)

                if (paymentRequest.settleTx) {
                    setCompleted(true)
                    return
                }

                const response = getProviders()

                if (response.length > 0) {
                    setAvailableWallet(true)
                }
            })
                .catch(() => {
                    setLoading(false)
                    setFetchError('Payment request is not found.')
                    setFetchErrorDetails('The payment request you are trying to access is not accessible. Please check the link or contact the merchant for assistance. If the issue persists please contact us for additional support.')
                })
        }
    }, [settings])

    useEffect(() => {
        if (!paymentRequest || !settings) return
        if (paymentRequest.settleTx) {
            setCompleted(true)
            return
        }

        setPaymentAddress(paymentRequest.sparkAddress)

        if (paymentRequest.redeemAmount) {
            setAlreadyRedeemedTokens(paymentRequest.redeemAmount)
            paymentRequest.amount -= paymentRequest.redeemAmount
            setPaymentRequest(paymentRequest)
            console.log(paymentRequest, 'after redeem')
        }
        else {
            subscribeRedeem(settings, paymentRequest.id, (redeemAmount: number, redeemTransaction: string) => {
                setPaymentRequest(prev => prev ? { ...prev, redeemAmount, redeemTx: redeemTransaction } : prev)
                toast.success('Token have been redeemed. You can proceed to the payment with the discount applied')
                setRedeemLoading(false)
            })
        }

        subscribePayment(settings, paymentRequest.id, (transaction: string, settlementMode: string) => {
            setPaymentConfirmation({ transaction, settlementMode })
        })
    }, [paymentRequest])

    useEffect(() => {
        if (!paymentRequest || paymentConfirmation || completed) return
        if (remainingRefreshTime > 0) {
            new Promise((r) => setTimeout(r, 1000)).then(() => setRemainingRefreshTime(prev => prev - 1))
        }
        else {
            refreshBtc(paymentRequest.id)
        }
    }, [paymentRequest, remainingRefreshTime, paymentConfirmation])

    const connectWallet = async () => {
        if (!paymentRequest) return

        const data = await request('getAccounts', { purposes: [AddressPurpose.Spark, AddressPurpose.Payment] });
        if (data.status !== 'success') {
            return;
        }
        const address = data.result.at(0)?.address;
        if (!address) {
            return;
        }

        setWallet(address);
        setTimeout(() => posthog?.capture('wallet_connected_for_discount', { payment_id: paymentRequest.id }))

        setLoadingTokens(true)

        const sparkBalance = await request('spark_getBalance', null)
        if (sparkBalance.status == 'error') {
            return
        }

        const tokenIdentifierHex = sparkBech32ToHex(paymentRequest.tokenId)
        const tokenBalance = sparkBalance.result.tokenBalances.find(tb => tb.tokenMetadata.tokenIdentifier == tokenIdentifierHex)
        if (!tokenBalance) {
            return
        }

        setTokenBalance({
            name: tokenBalance.tokenMetadata.tokenName,
            amount: parseInt(tokenBalance.balance) / (10 ** tokenBalance.tokenMetadata.decimals),
            decimals: tokenBalance.tokenMetadata.decimals
        })

        setLoadingTokens(false)
    }

    const handleRedeemTokens = async () => {
        if (!paymentRequest || !tokenBalance) return
        setRedeemLoading(true)
        setRedeemError(undefined)

        const response = await request("spark_transferToken", {
            receiverSparkAddress: paymentRequest.sparkAddress,
            tokenIdentifier: paymentRequest.tokenId,
            tokenAmount: redeemedTokens
        });
        if (response.status == 'error') {
            setRedeemLoading(false)
            if (response.error.code === RpcErrorCode.USER_REJECTION) {
                return
            }
            setRedeemError(response.error.message)
            return
        }
        setTimeout(() => posthog?.capture('tokens_redeemed', {
            payment_id: paymentRequest.id,
            tokens_redeemed: redeemedTokens,
        }))
    }

    const payWithXVerse = async () => {
        if (!paymentAddress) return
        setSendError(undefined)
        setSendLoading(true)
        const amountSats = BigInt(Math.floor(btcAmount * 100_000_000))
        if (selectedPaymentTab == 'spark') {
            const response = await request('spark_transfer', { amountSats: amountSats.toString(), receiverSparkAddress: paymentAddress })
            setSendLoading(false)
            if (response.status == 'error') {
                if (response.error.code === RpcErrorCode.USER_REJECTION) {
                    return
                }
                setSendError(response.error.message)
                return
            }

            setTimeout(() => posthog?.capture('payment_completed', { payment_method: 'spark', amount_btc: btcAmount, payment_id: paymentRequest?.id }))
            setPaymentMade(true)
        }
        else if (selectedPaymentTab == 'btc') {
            const response = await request('sendTransfer', { recipients: [{ address: paymentAddress, amount: Number(amountSats) }] })
            setSendLoading(false)
            if (response.status === "error") {
                if (response.error.code === RpcErrorCode.USER_REJECTION) {
                    return
                }
                setSendError(response.error.message)
                return
            }

            setTimeout(() => posthog?.capture('payment_completed', { payment_method: 'btc', amount_btc: btcAmount, payment_id: paymentRequest?.id }))
            setPaymentMade(true)
        }
    }

    const handleSelectPaymentChange = (tab: TabType) => {
        setSelectedPaymentTab(tab)
        setTimeout(() => posthog?.capture('payment_method_selected', { payment_method: tab, payment_id: paymentRequest?.id }))
        if (tab == 'spark') {
            setPaymentAddress(paymentRequest?.sparkAddress)
        }
        else if (tab == 'lightning') {
            setPaymentAddress(paymentRequest?.lightningInvoice)
        }
        else {
            setPaymentAddress(paymentRequest?.btcAddress)
        }
    }

    const copy = (address: string) => {
        navigator.clipboard.writeText(address)
        const toastId = toast.info('Address copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    const maxRedeemable = paymentRequest && !paymentRequest.redeemAmount ? paymentRequest.amount * (paymentRequest.discountRate / 100) : 0
    const maxRedeemableToken = Math.floor(Math.max(0, maxRedeemable))

    return (
        <div className="bg-gray-50 h-screen">
            <div className="lg:max-w-2xl mx-auto">
                {loading &&
                    <div className="flex h-screen">
                        <div className='m-auto flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                            <Spinner />
                        </div>
                    </div>
                }

                {!loading && fetchError &&
                    <div className="flex flex-col pt-5 py-10 px-3 gap-10">
                        <div className='flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                        </div>
                        <Card>
                            <CardHeader>
                                <h1 className="text-4xl text-black font-serif">{fetchError}</h1>
                            </CardHeader>
                            <CardContent className="mt-10 flex flex-col gap-5">
                                {fetchErrorDetails.split('.').map((s, i) => (
                                    <p className="text-gray-500 text-xl" key={i}>{s}</p>
                                ))}
                            </CardContent>
                            <CardFooter>
                                <p className="text-xs text-center text-slate-600"><a href='mailto:bitlasso@hexquarter.com'>support</a></p>
                            </CardFooter>
                        </Card>
                    </div>
                }

                {!loading && !fetchError && paymentRequest && paymentConfirmation &&
                    <div className="flex flex-col pt-5 py-10 px-3 gap-10">
                        <div className='flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                        </div>
                        <Card className="gap-5 p-5">
                            <CardHeader className="flex flex-col items-center gap-5">
                                <div className="flex items-center p-4 bg-green-600/20 rounded-full"><CheckCircle2 className="h-8 w-8 text-green-800" /></div>
                                <h1 className="text-xs text-green-600 uppercase font-mono bg-green-600/20 px-2 py-1 border border-green-600/10 rounded-lg flex items-center gap-2 tracking-widest">
                                    <div className="h-2 w-2 bg-green-600 rounded"></div>
                                    Payment received
                                </h1>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-10">
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-5">
                                        <p className="text-3xl font-serif text-center">Payment confirmed</p>
                                        <div className="flex flex-col">
                                            <p className="text-muted-foreground text-center">Your payment has been received and processed. The merchant has been notified and may follow up with you shortly.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-5 border-t border-border/40 pt-10">
                                        <div className="flex justify-between border-b border-border/40 pb-5">
                                            <span>Status</span>
                                            <span className="text-green-800">Completed</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/40 pb-5">
                                            <span>Network</span>
                                            <span>{paymentConfirmation.settlementMode}</span>
                                        </div>
                                        <div className="flex justify-between pb-5">
                                            <span>Transaction</span>
                                            <span className="flex items-center gap-2">{shortenAddress(paymentConfirmation.transaction)} <ExternalLink className="h-4" onClick={() => window.open(paymentRequest.settlementMode == 'spark' ? `https://sparkscan.io/tx/${paymentRequest.settleTx}` : `https://www.blockchain.com/explorer/transactions/btc/${paymentRequest.settleTx}`, '_blank')} /></span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground text-center">You can safely close this window.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                }

                {!loading && !fetchError && paymentRequest && completed &&
                    <div className="flex flex-col pt-5 py-10 px-3 gap-10">
                        <div className='flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                        </div>
                        <Card className="gap-5 p-5">
                            <CardHeader className="flex flex-col items-center gap-5">
                                <div className="flex items-center p-4 bg-sky-600/20 rounded-full"><AlertCircle className="h-8 w-8 text-sky-800" /></div>
                                <h1 className="text-xs text-sky-600 uppercase font-mono bg-sky-600/20 px-2 py-1 border border-sky-600/10 rounded-lg flex items-center gap-2 tracking-widest">
                                    <div className="h-2 w-2 bg-sky-600 rounded"></div>
                                    Already paid
                                </h1>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-10">
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-5">
                                        <p className="text-3xl font-serif text-center">This invoice has been settled</p>
                                        <div className="flex flex-col">
                                            <p className="text-muted-foreground text-center">Payment for this request was already received. You cannot pay it again.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-5 border-t border-border/40 pt-10">
                                        <div className="flex justify-between border-b border-border/40 pb-5">
                                            <span>Status</span>
                                            <span className="text-green-800">Paid</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/40 pb-5">
                                            <span>Network</span>
                                            <span className="uppercase">{paymentRequest.settlementMode}</span>
                                        </div>
                                        <div className="flex justify-between pb-5">
                                            <span>Transaction</span>
                                            <span className="flex items-center gap-2">{shortenAddress(paymentRequest.settleTx as string)} <ExternalLink className="h-4" onClick={() => window.open(paymentRequest.settlementMode == 'spark' ? `https://sparkscan.io/tx/${paymentRequest.settleTx}` : `https://www.blockchain.com/explorer/transactions/btc/${paymentRequest.settleTx}`, '_blank')} /></span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                }

                {!loading && !fetchError && paymentRequest && !completed && !paymentConfirmation &&
                    <div className="flex flex-col">
                        <div className="flex flex-col pt-5 py-10 px-3 gap-10">
                            <div className='flex flex-col items-center gap-2'>
                                <img src={LogoPng} className='w-10' />
                                <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                    <span className='text-primary'>bit</span>
                                    lasso
                                </div>
                            </div>
                            <Card className="gap-0 p-0">
                                <CardHeader className="mt-5 ml-5">
                                    <h1 className="font-mono uppercase text-xs text-muted-foreground">Payment request</h1>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-10 mt-5 m-5">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <p className="text-4xl font-serif flex gap-2 items-end">
                                                {paymentRequest.redeemAmount && <span className="line-through text-xl ">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount + paymentRequest.redeemAmount)}</span>}
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}
                                            </p>
                                            <span className="bg-primary/10 px-2 py-1 rounded-lg text-primary border-primary/20 border font-mono text-xs">{btcAmount} BTC</span>
                                        </div>
                                        {alreadyRedeemedTokens > 0 &&
                                            <div className="flex flex-col gap-5 rounded-lg mt-2 mb-2">
                                                <div className="flex flex-col gap-0 items-start align-items text-muted-foreground">
                                                    <p className="text-xs">A loyalty discount have already been applied after redeeming of {alreadyRedeemedTokens} tokens.</p>
                                                    <a href={`https://sparkscan.io/tx/${paymentRequest.redeemTx}`} className='text-xs text-primary hover:underline' target='_blank'>Check out transaction</a>
                                                </div>
                                            </div>
                                        }
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 bg-green-400 animate-pulse rounded"></div>
                                            <p className="text-sm">Price refreshes in {formatTime(remainingRefreshTime)}</p>
                                        </div>
                                        {paymentRequest.description &&
                                            <div className="flex flex-col mt-5">
                                                <p className="font-serif text-normal">Description</p>
                                                <p className="text-xs text-muted-foreground">{paymentRequest.description}</p>
                                            </div>
                                        }
                                    </div>
                                    <Tabs defaultValue="spark" onValueChange={(e) => handleSelectPaymentChange(e as TabType)}>
                                        <TabsList className="w-full flex bg-transparent ">
                                            <TabsTrigger value={"spark"} className="font-mono uppercase text-sm data-[state=active]:border-primary  border-b p-5 flex-1">Spark</TabsTrigger>
                                            <TabsTrigger value={"lightning"} className="font-mono uppercase text-sm data-[state=active]:border-primary border-b p-5 flex-1">Lightning</TabsTrigger>
                                            <TabsTrigger value={"btc"} className="font-mono uppercase text-sm data-[state=active]:border-primary border-b p-5 flex-1">Bitcoin</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="spark" className="flex mt-10 flex flex-col gap-10">
                                            <div className="grid gap-5 lg:grid-cols-2 gap-2 ">
                                                <div className="text-sm flex flex-col gap-3 pt-10">
                                                    <div className="flex gap-2 items-center justify-between">
                                                        <p className="text-lg font-medium">Spark payment</p>
                                                    </div>
                                                    <p className="mt-5">Send exactly <span className="font-semibold">{btcAmount * 100_000_000} sats</span> to this address. </p>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex justify-between bg-primary/10 border-1 border-primary/10 px-4 py-2 rounded-lg items-center gap-5">
                                                            <div className="flex flex-col gap-2">
                                                                <span className="text-sm">{shortenAddress(paymentRequest.sparkAddress)}</span>
                                                            </div>
                                                            <div className="border border-primary rounded-full p-2 hover:bg-white">
                                                                <Copy className="w-3 h-3 text-primary" onClick={() => copy(paymentRequest.sparkAddress)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 mt-10">
                                                        <div className="border-t pt-5 flex flex-col gap-2">
                                                            <p className="text-xs text-muted-foreground">With Spark you get instant, zero-fee transfers with privacy</p>
                                                            <p className="text-xs text-muted-foreground">No Spark wallet? Install <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">Xverse</a> for the best experience.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 py-10 rounded-lg">
                                                    <div className="flex justify-center">
                                                        <QRCode size={200} value={paymentRequest.sparkAddress} />
                                                    </div>
                                                </div>
                                            </div>
                                            {availableWallet && btcAmount > 0 && <div className="flex flex-col gap-5">
                                                <div className="flex flex-row gap-2 items-center">
                                                    <Separator className="flex-1" />
                                                    <span className="flex-1 text-center text-xs text-muted-foreground">or pay with browser wallet</span>
                                                    <Separator className="flex-1" />
                                                </div>
                                                {!paymentMade && <div className="flex justify-center"><Button className="flex items-center gap-2" onClick={payWithXVerse} disabled={sendLoading}><img src={XVerseWhiteLogo} className="h-3 w-3" />Pay with XVerse wallet {sendLoading && <Spinner />}</Button></div>}
                                                {paymentMade && <div className="flex justify-center"><p className="text-sm text-center bg-primary/20 text-primary px-4 py-2 border-1 border-primary/40 rounded-sm shadow-lg animate-bounce text-muted-foreground">Your payment is in process and will be completed once confirmed.</p></div>}
                                                {sendError && <p className="text-primary text-xs text-center">An error occured: {sendError}</p>}
                                            </div>}
                                        </TabsContent>
                                        <TabsContent value="lightning" className="flex mt-10 flex flex-col gap-10">
                                            <div className="grid gap-5 lg:grid-cols-2 gap-2">
                                                <div className="text-sm flex flex-col gap-3 py-10">
                                                    <div className="flex gap-2 items-center justify-between">
                                                        <p className="text-lg font-medium">Lightning invoice</p>
                                                        {/* <div>
                                                            <span className="bg-gray-50 px-4 py-2 border border-border/40 rounded text-muted-foreground text-xs rounded-full"> Conf. ~10 min.</span>
                                                        </div> */}
                                                    </div>

                                                    <p className="mt-5">Send exactly <span className="font-semibold">{btcAmount * 100_000_000} sats</span> to this address. </p>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex justify-between bg-primary/10 border-1 border-primary/10 px-4 py-2 rounded-lg items-center gap-5">
                                                            <div className="flex flex-col gap-2">
                                                                <span className="text-sm">{shortenAddress(paymentRequest.lightningInvoice)}</span>
                                                            </div>
                                                            <div className="border border-primary rounded-full p-2 hover:bg-white">
                                                                <Copy className="w-3 h-3 text-primary" onClick={() => copy(paymentRequest.lightningInvoice)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 py-10 rounded-lg">
                                                    <div className="flex justify-center">
                                                        <QRCode size={200} value={paymentRequest.lightningInvoice} />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* <div className="flex flex-col gap-2">
                                                <p className="text-sm text-center font-medium">Lightning invoice</p>
                                                <p className="text-xs text-center">Point your Lightning wallet at the QR code to pay instantly.</p>
                                                <p className="text-sm text-center mt-5">Send exactly <span className="font-semibold">{btcAmount * 100_000_000} sats</span> to this address. </p>
                                            </div>
                                            <div className="flex justify-center">
                                                <QRCode size={150} value={paymentRequest.lightningInvoice} />
                                            </div> */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between bg-gray-100 px-4 py-2 rounded-lg items-center">
                                                    <span className="text-xs">{shortenAddress(paymentRequest.lightningInvoice)}</span>
                                                    <div className="border border-primary rounded-full p-2 hover:bg-white">
                                                        <Copy className="w-3 h-3 text-primary" onClick={() => copy(paymentRequest.lightningInvoice)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="btc" className="flex mt-10 flex flex-col gap-10">
                                            <div className="grid gap-5 lg:grid-cols-2 gap-2">
                                                <div className="text-sm flex flex-col gap-3 py-10">
                                                    <div className="flex gap-2 items-center justify-between">
                                                        <p className="text-lg font-medium">Bitcoin payment</p>
                                                        <div>
                                                            <span className="bg-gray-50 px-4 py-2 border border-border/40 rounded text-muted-foreground text-xs rounded-full"> Conf. ~10 min.</span>
                                                        </div>
                                                    </div>

                                                    <p className="mt-5">Send exactly <span className="font-semibold">{btcAmount * 100_000_000} sats</span> to this address. </p>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex justify-between bg-primary/10 border-1 border-primary/10 px-4 py-2 rounded-lg items-center gap-5">
                                                            <div className="flex flex-col gap-2">
                                                                <span className="text-sm">{shortenAddress(paymentRequest.btcAddress)}</span>
                                                            </div>
                                                            <div className="border border-primary rounded-full p-2 hover:bg-white">
                                                                <Copy className="w-3 h-3 text-primary" onClick={() => copy(paymentRequest.btcAddress)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 py-10 rounded-lg">
                                                    <div className="flex justify-center">
                                                        <QRCode size={200} value={paymentRequest.btcAddress} />
                                                    </div>
                                                </div>
                                            </div>

                                            {availableWallet && btcAmount > 0 && <div className="flex flex-col gap-5">
                                                <div className="flex flex-row gap-2 items-center">
                                                    <Separator className="flex-1" />
                                                    <span className="flex-1 text-center text-xs text-muted-foreground">or pay with browser wallet</span>
                                                    <Separator className="flex-1" />
                                                </div>
                                                {!paymentMade && <div className="flex justify-center"><Button className="flex items-center gap-2" onClick={payWithXVerse} disabled={sendLoading}><img src={XVerseWhiteLogo} className="h-3 w-3" />Pay with XVerse wallet {sendLoading && <Spinner />}</Button></div>}
                                                {paymentMade && <div className="flex justify-center"><p className="text-sm text-center bg-primary/20 text-primary px-4 py-2 border-1 border-primary/40 rounded-sm shadow-lg animate-bounce text-muted-foreground">Your payment is in process and will be completed once confirmed.</p></div>}
                                                {sendError && <p className="text-primary text-xs text-center">An error occured: {sendError}</p>}
                                            </div>}


                                        </TabsContent>
                                    </Tabs>

                                    {maxRedeemableToken > 0 &&
                                        <Collapsible>
                                            <CollapsibleTrigger className="hover:cursor-pointer w-full">
                                                <div className="rounded-t-lg border p-3 text-sm flex justify-between items-center lg:flex-row flex-col gap-2">
                                                    <div className="flex gap-5">
                                                        <div className="flex">
                                                            <div className="bg-primary/20 text-primary font-mono rounded-lg px-4 py-2 text-xs">Up to {paymentRequest.discountRate}% off</div>
                                                        </div>
                                                        <div className="flex flex-col text-xs text-left">
                                                            <span className="">Loyalty discount</span>
                                                            <span className="text-muted-foreground">Redeem tokens to reduce this payment</span>
                                                        </div>
                                                    </div>
                                                    <div><ChevronDown className="text-muted-foreground" /></div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="px-5 border border-t-0 rounded-b-lg bg-gray-50">
                                                <Tabs defaultValue="xverse" className="gap-0">
                                                    <TabsList className="p-0 border-border/40 lg:border-b-1 w-full rounded-none flex-col lg:flex-row flex h-full pt-5">
                                                        <TabsTrigger value="xverse" className="bg-white text-sm data-[state=active]:text-primary px-4 py-2 w-full data-[state=active]:bg-primary/10 data-[state=active]:border-primary/20 data-[state=active]:border-1 lg:rounded-tl lg:rounded-tr xs:rounded-lg">XVerse wallet</TabsTrigger>
                                                        <TabsTrigger value="mobile" className="bg-white text-sm data-[state=active]:text-primary px-4 py-2 w-full data-[state=active]:bg-primary/10 data-[state=active]:border-primary/20 data-[state=active]:border-1 lg:rounded-tl lg:rounded-tr xs:rounded-lg">External wallet</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="xverse" className="p-5 bg-white ">
                                                        {!wallet &&
                                                            <div className="flex flex-col gap-5 items-center">
                                                                <img src={XVerseLogo} className="h-8 w-8" />
                                                                <p>Connect Xverse wallet</p>
                                                                <p className="text-sm text-muted-foreground text-center">Connect your Xverse wallet to check your token balance and apply a discount to this payment.</p>
                                                                {availableWallet && <Button variant='outline' onClick={connectWallet}>Connect</Button>}
                                                                <p className="text-muted-foreground text-xs border-t pt-2 mt-2">Don't have Xverse? <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">Download it free</a></p>
                                                            </div>
                                                        }
                                                        {wallet &&
                                                            <div className="flex flex-col gap-10">
                                                                <div className="p-3 rounded-lg flex justify-between items-center bg-gray-50 shadow-xs border border-border/40 ">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-2 w-2 bg-green-400 rounded"></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm">XVerse</span>
                                                                            <span className="text-xs text-muted-foreground">{shortenAddress(wallet, 5)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {loadingTokens && <Spinner />}
                                                                {!loadingTokens &&
                                                                    <>
                                                                        <div className="p-3 rounded-lg flex flex-col bg-gray-50 shadow-xs border border-border/40">
                                                                            <span className="text-sm text-muted-foreground">Available tokens</span>
                                                                            <span className="font-serif text-xl">{tokenBalance?.amount} {tokenBalance?.name}</span>
                                                                        </div>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex justify-between text-xs">
                                                                                <span>Tokens to redeem</span>
                                                                                <span>{redeemedTokens} {tokenBalance?.name}</span>
                                                                            </div>
                                                                            <Slider step={1} max={maxRedeemableToken} onValueChange={(val) => setRedeemedTokens(val[0])} />
                                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                                <span>0 (no discount)</span>
                                                                                <span>{maxRedeemableToken} (max 10%)</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 rounded-lg flex justify-between bg-green-400/10 shadow-xs border border-green-400/20">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs">You pay</span>
                                                                                <span className="text-sm text-green-600 font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount - redeemedTokens)}</span>
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs">You save</span>
                                                                                <span className="text-sm text-green-600 font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(redeemedTokens)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button onClick={handleRedeemTokens} disabled={redeemedTokens == 0 || redeemLoading}><Gift />Apply discount {redeemLoading && <Spinner />}</Button>
                                                                        {redeeemError && <p className="text-primary text-sm">Error: {redeeemError}</p>}
                                                                    </>
                                                                }
                                                            </div>
                                                        }
                                                    </TabsContent>
                                                    <TabsContent value="mobile" className="flex flex-col gap-5 items-center p-5 bg-white ">
                                                        <p>Redeem with external wallet</p>
                                                        <p className="text-sm text-muted-foreground text-center">Scan this QR code with any Spark-compatible wallet to apply your loyalty discount before paying.</p>
                                                        <div className="flex justify-center">
                                                            <QRCode value={paymentRequest.sparkAddress} size={150} />
                                                        </div>
                                                        <div className="flex flex-col gap-4 text-xs">
                                                            <div className="flex gap-2 items-center">
                                                                <span className="bg-gray-100 rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">1</span>
                                                                <span>Open any Spark-compatible wallet (i.e. <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">XVerse</a>, <a href="https://blitzwalletapp.com/" target="_blank" className="text-primary hover:underline">Blitz</a>) and tap Scan.</span>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                                <span className="bg-gray-100 rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">2</span>
                                                                <span>Scan this QR code and send {maxRedeemableToken > 1 ? `up to ${maxRedeemableToken} tokens` : '1 token'}.</span>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                                <span className="bg-gray-100 rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">3</span>
                                                                <span>Confirm the redemption. This page will update automatically with your discount applied.</span>
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    }
                                </CardContent>
                                <CardFooter className="pb-6 flex justify-center border-t">
                                    <p className="text-xs text-center text-slate-600 flex items-center text-muted-foreground gap-2">
                                        <Lock className="h-3" />
                                        <span>Secure by Bitlasso</span>
                                        <span>- </span>
                                        <a href='mailto:bitlasso@hexquarter.com' className="hover:underline">support</a></p>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>}
            </div>
        </div>
    )
}