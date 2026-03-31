import { type TabType } from "@/components/dashboard/receive-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getPaymentPrice, type Settings } from "@/lib/api"
import { shortenAddress } from "@/lib/utils"
import { Copy, ExternalLink, GiftIcon, MailIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import { usePostHog } from "@posthog/react";

import { getProviders, request, RpcErrorCode } from "sats-connect";
import { toast } from "sonner"

import LogoPng from '../../public/logo.svg'
import { fetchPaymentRequest, getBitcoinPrice, subscribePayment, type PaymentRequest } from "@/lib/nostr"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { TabsContent, TabsTrigger } from "@radix-ui/react-tabs"
import QRCode from "react-qr-code"

import XVerseWhiteLogo from '../../public/xverse_white_logo.png'

import { Separator } from "@/components/ui/separator"
import { useSettings } from "@/hooks/use-settings"
import { LoyaltySection } from "@/components/payment/loyalty-section"
import { FaBitcoin } from "react-icons/fa";
import { BiSolidZap } from "react-icons/bi";
import { PaidRequest } from "@/components/payment/paid-request"
import { IconDiscount } from "@tabler/icons-react"
import { PaymentRequestInfo } from "@/components/payment/payment-request-info"

type PaymentConfirmation = { transaction: string, settlementMode: string, btcAmount: number }

export const PaymentPage: React.FC = () => {
    const { id } = useParams()
    const { settings } = useSettings()
    const [loading, setLoading] = useState(true)

    const [paymentRequest, setPaymentRequest] = useState<undefined | PaymentRequest>(undefined)

    const [fetchError, setFetchError] = useState<string>("")
    const [fetchErrorDetails, setFetchErrorDetails] = useState<string>("")

    const [btcAmount, setBtcAmount] = useState(0)
    const [btcAmountDate, setBtcAmountDate] = useState<undefined | Date>(undefined)

    const ran = useRef(false);

    useEffect(() => {
        if (!settings || ran.current) return;
        ran.current = true;

        if (id && !paymentRequest) {
            fetchPaymentRequest(settings, id).then(async (paymentRequest) => {
                setLoading(false)
                setPaymentRequest(paymentRequest)

                if (paymentRequest.settleTx) {
                    getBitcoinPrice(settings, paymentRequest.id).then(priceDetails => {
                        if (!priceDetails) {
                            return
                        }
                        setBtcAmount(Math.round((paymentRequest.amount / priceDetails.usdPrice) * 100000000) / 100000000)
                        setBtcAmountDate(priceDetails.date)
                    })
                }
            })
                .catch(() => {
                    setLoading(false)
                    setFetchError('Payment request is not found.')
                    setFetchErrorDetails('The payment request you are trying to access is not accessible. Please check the link or contact the merchant for assistance. If the issue persists please contact us for additional support.')
                })
        }
    }, [settings])

    const handleConfirmation = (confirmation: PaymentConfirmation) => {
        if (!paymentRequest) return
        getBitcoinPrice(settings as Settings, paymentRequest!.id).then(priceDetails => {
            if (!priceDetails) {
                return
            }
            setBtcAmount(Math.round((paymentRequest!.amount / priceDetails.usdPrice) * 100000000) / 100000000)
            setBtcAmountDate(priceDetails.date)
        })

        setPaymentRequest((prev) => {
            if (!prev) return

            prev.settleTx = confirmation.transaction
            prev.settlementMode = confirmation.settlementMode as 'spark' | 'btc'
            return prev
        })
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="lg:max-w-6xl mx-auto">
                {loading &&
                    <div className="flex h-screen">
                        <div className='m-auto flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                            <Spinner />
                            <p className='mt-10 text-primary font-mono uppercase text-xs animate-[bounce_0.8s_ease-in-out_infinite]'>Payment request sync...</p>
                        </div>
                    </div>
                }

                {!loading && fetchError &&
                    <ErrorState error={fetchError} errorDetails={fetchErrorDetails} />
                }

                {!loading && !fetchError && paymentRequest && paymentRequest.settleTx &&
                    <PaidRequest paymentRequest={paymentRequest} btcAmount={btcAmount} btcAmountDate={btcAmountDate} />
                }

                {!loading && !fetchError && settings && paymentRequest && !paymentRequest.settleTx &&
                    <PendingPaymentState settings={settings} paymentRequest={paymentRequest} handleConfirmation={handleConfirmation} />
                }
            </div>
        </div>
    )
}

const ErrorState: React.FC<{ error: string, errorDetails: string }> = ({ error, errorDetails }) => (
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
                <h1 className="text-4xl text-black font-serif">{error}</h1>
            </CardHeader>
            <CardContent className="mt-10 flex flex-col gap-5">
                {errorDetails.split('.').map((s, i) => (
                    <p className="text-gray-500 text-xl" key={i}>{s}</p>
                ))}
            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-xs text-center text-slate-600"><a href='mailto:bitlasso@hexquarter.com'>support</a></p>
            </CardFooter>
        </Card>
    </div>
)

const PendingPaymentState: React.FC<{
    settings: Settings,
    paymentRequest: PaymentRequest,
    handleConfirmation: (confirmation: PaymentConfirmation) => void
}> = ({ settings, paymentRequest, handleConfirmation }) => {

    const posthog = usePostHog()

    const [remainingRefreshTime, setRemainingRefreshTime] = useState(0)
    const [btcAmount, setBtcAmount] = useState(0)

    const [redeemDetails, setRedeemDetails] = useState<{ redeemAmount: number, redeemTransaction: string } | undefined>(paymentRequest.redeemTx ? { redeemAmount: paymentRequest.redeemAmount as number, redeemTransaction: paymentRequest.redeemTx as string } : undefined)
    const [availableWallet, setAvailableWallet] = useState<boolean>(false)

    const [sendLoading, setSendLoading] = useState(false)
    const [sendError, setSendError] = useState<undefined | string>(undefined)
    const [paymentMade, setPaymentMade] = useState(false)
    const [selectedPaymentTab, setSelectedPaymentTab] = useState("spark")
    const [paymentAddress, setPaymentAddress] = useState<undefined | string>(paymentRequest.sparkAddress)
    const [tokenMetadata, setTokenMetadata] = useState<{ ticker: string } | undefined>(undefined)

    useEffect(() => {
        const response = getProviders()
        if (response.length > 0) {
            setAvailableWallet(true)
        }

        void(() => {
            fetch(`https://api.sparkscan.io/v1/tokens/${paymentRequest.tokenId}`)
                .then(async (r) => {
                    if (r.ok) {
                        const { metadata } = await r.json()
                        setTokenMetadata({ ticker: metadata.ticker })
                    }
                })
                .catch(console.error)
        })()

        subscribePayment(settings, paymentRequest.id, (transaction: string, settlementMode: string) => {
            handleConfirmation({ transaction, settlementMode, btcAmount })
        })
    }, [])

    useEffect(() => {
        if (remainingRefreshTime > 0) {
            new Promise((r) => setTimeout(r, 1000)).then(() => setRemainingRefreshTime(prev => prev - 1))
        }
        else {
            refreshBtc(paymentRequest.id)
        }
    }, [paymentRequest, remainingRefreshTime])

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

            void(() => posthog?.capture('payment_completed', { payment_method: 'spark', amount_btc: btcAmount, payment_id: paymentRequest?.id }))()
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

            void(() => posthog?.capture('payment_completed', { payment_method: 'btc', amount_btc: btcAmount, payment_id: paymentRequest?.id }))()
            setPaymentMade(true)
        }
    }

    const handleSelectPaymentChange = (tab: TabType) => {
        setSelectedPaymentTab(tab)
        void(() => posthog?.capture('payment_method_selected', { payment_method: tab, payment_id: paymentRequest?.id }))()
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

    const maxRedeemable = !redeemDetails ? paymentRequest.amount * (paymentRequest.discountRate / 100) : 0
    const maxRedeemableToken = Math.floor(Math.max(0, maxRedeemable))

    const [openedLoyalty, setOpenLoyalty] = useState(false)

    return (
        <div className="flex flex-col lg:py-20">
            <Card className="flex flex-col gap-10 p-0 gap-0 shadow-xs not-sm:rounded-none">
                <CardHeader className='flex flex-col md:flex-row p-0! md:items-center justify-between border-b border-border/60 p-4!'>
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
                    <div className="gap-10 p-0 flex-1 bg-white p-5 md:p-10 flex flex-col lg:w-1/2 ">
                        <div className="flex flex-col gap-5">
                            <h1 className="text-2xl">
                                <span className="text-primary">Payment</span> request
                            </h1>
                            <p className="text-sm text-muted-foreground">Find payment details below</p>
                        </div>
                        <PaymentRequestInfo paymentRequest={paymentRequest} btcAmount={btcAmount} redeemDetails={redeemDetails} remainingRefreshTime={remainingRefreshTime} />
                        {maxRedeemableToken > 0 &&
                            <div className="flex flex-col gap-2 p-0 ">
                                <div className="flex items-center gap-2 text-muted-foreground/60 ">
                                    <IconDiscount className="w-4 h-4" />
                                    <p className="text-sm flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-xs flex">Loyalty program </p>
                                </div>
                                <div className="flex gap-2 flex-col">
                                    {!openedLoyalty && <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm">Discount is available to redeem tokens</p>
                                        <Button variant={'outline'} className="text-xs h-8" onClick={() => setOpenLoyalty(true)}><GiftIcon className="text-primary" /> Save up to {paymentRequest.discountRate}%</Button>
                                    </div>}
                                    {openedLoyalty &&
                                        <LoyaltySection
                                            settings={settings}
                                            paymentRequest={paymentRequest}
                                            handleRedeem={((transaction, amount) => setRedeemDetails({ redeemAmount: amount, redeemTransaction: transaction }))}
                                            maxRedeemableToken={maxRedeemableToken}
                                            availableWallet={availableWallet}
                                        />
                                    }
                                </div>
                            </div>
                        }
                        {redeemDetails && redeemDetails.redeemAmount > 0 &&
                            <div className="flex flex-col gap-3">

                                <div className="flex items-center gap-2"> <IconDiscount className="text-muted-foreground/60 w-4 h-4" />
                                    <p className="text-sm flex items-center gap-2 font-mono uppercase text-muted-foreground/60 tracking-[0.2em] text-xs flex">Loyalty program </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-foreground">
                                        A discount has been applied after redemption of {" "}
                                        <span className="font-semibold">{redeemDetails.redeemAmount} {tokenMetadata ? tokenMetadata.ticker : 'token'} (= ${redeemDetails.redeemAmount} off)</span>.
                                    </p>
                                    <div>
                                        <Button variant='outline' className="flex gap-2 text-xs h-8" onClick={() => window.open(`https://sparkscan.io/tx/${redeemDetails.redeemTransaction}`, '_blank')}>
                                            Check out transaction <ExternalLink />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    <div className="gap-10 p-0 flex-1 bg-primary/5 p-5 md:p-10 flex flex-col ">
                        <div className="flex flex-col gap-5">
                            <h2 className="text-2xl">
                                <span className="text-primary">Payment</span> method
                            </h2>
                            <p className="text-sm text-muted-foreground">Choose how you’d like to pay</p>
                        </div>
                        <div className="flex flex-col gap-10">
                            <Tabs defaultValue="spark" className="gap-3" onValueChange={(e) => handleSelectPaymentChange(e as TabType)}>
                                <TabsList className="p-0 border-0 rounded-none flex-col flex-row flex h-full bg-transparent gap-2 items-start">
                                    <TabsTrigger value="spark" className="transition border-0 bg-white  text-sm data-[state=active]:text-white px-4 py-2 w-full data-[state=active]:bg-black data-[state=active]:border-primary/20 rounded-full shadow-sm h-10 flex items-center justify-center gap-2 text-black ">
                                        <svg width="20" height="20" viewBox="0 0 68 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M39.7159 25.248L40.8727 0.570312H26.4219L27.5787 25.2483L4.46555 16.5221L0 30.2656L23.8282 36.7915L8.38717 56.0763L20.0781 64.5703L33.6483 43.9245L47.2179 64.5695L58.9089 56.0755L43.4679 36.7909L67.2937 30.2657L62.8281 16.5221L39.7159 25.248ZM33.6472 33.6013L33.647 33.6007H33.6466L33.6462 33.6021L33.6472 33.6013Z" fill="currentColor" />
                                        </svg>
                                        Spark
                                    </TabsTrigger>
                                    <TabsTrigger value="ln" className="transition order-0 bg-white text-sm data-[state=active]:text-white px-4 py-2 w-full data-[state=active]:bg-black data-[state=active]:border-primary/20 rounded-full shadow-sm h-10 flex items-center justify-center gap-2 text-amber-500 ">
                                        <BiSolidZap className="h-6 w-6" />
                                        Lightning
                                    </TabsTrigger>
                                    <TabsTrigger value="btc" className="transition border-0 bg-white text-sm data-[state=active]:text-white px-4 py-2 w-full data-[state=active]:bg-black data-[state=active]:border-primary/20 rounded-full shadow-sm h-10 flex items-center justify-center gap-2 text-primary">
                                        <FaBitcoin className="h-6 w-6" />
                                        Bitcoin
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="spark" className="p-5 bg-white backdrop-blur-sm rounded-xl ">
                                    <div className="flex flex-col gap-2 ">
                                        <div className="text-sm flex flex-col gap-5">
                                            <div className="flex md:flex-row flex-col justify-between gap-1">
                                                <p className="text-lg font-medium text-xl font-serif">Pay with Spark</p>
                                                <div className="flex gap-2">
                                                    <span className="text-xs text-primary font-mono">
                                                        INSTANT • ZERO FEE
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-muted-foreground text-xs">Send exactly <span className="font-semibold">{Math.floor(btcAmount * 100_000_000)} sats</span> to complete this payment.</p>

                                            <div className="flex flex-col gap-5">
                                                <div className="p-8 flex justify-center">
                                                    <QRCode size={200} value={paymentRequest.sparkAddress || ""} />
                                                </div>

                                                <div className="w-full flex justify-between items-center bg-white border rounded-lg px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {shortenAddress(paymentRequest.sparkAddress || "")}
                                                    </span>

                                                    <Copy
                                                        className="w-4 h-4 cursor-pointer text-primary"
                                                        onClick={() => copy(paymentRequest.sparkAddress)}
                                                    />
                                                </div>
                                                {!paymentMade && availableWallet && btcAmount > 0 && <div className="flex flex-col gap-2 mt-2">
                                                    <div className="flex items-center gap-5 mb-2">
                                                        <Separator className="flex-1" />
                                                        <span className="text-xs text-muted-foreground">or pay with wallet</span>
                                                        <Separator className="flex-1" />
                                                    </div>
                                                    <div className="flex justify-center"><Button className="flex items-center gap-2 text-xs" onClick={payWithXVerse} disabled={sendLoading}>
                                                        {sendLoading ? <Spinner /> : <span className="flex items-center gap-2"><img src={XVerseWhiteLogo} className="h-3 w-3" />Pay with XVerse</span>}
                                                    </Button>
                                                    </div>
                                                    {sendError && <p className="text-primary text-xs text-center">An error occured: {sendError}</p>}
                                                </div>}
                                                {paymentMade &&
                                                    <div className="flex flex-col gap-0 border-b border-t py-5">
                                                        <p className="text-primary font-semibold">Your payment have been sent.</p>
                                                        <p className="">It is currently being procesed to be completed once confirmed.</p>
                                                        <p className="italic mt-5">Thanks for using our service.</p>
                                                    </div>
                                                }
                                                <p className="text-xs text-muted-foreground text-center">
                                                    No Spark wallet? Install{" "}
                                                    <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">Xverse</a>,{" "}
                                                    <a href="https://blitzwalletapp.com/" target="_blank" className="text-primary hover:underline">Blitz</a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="ln" className="p-5 bg-white backdrop-blur-sm rounded-xl ">
                                    <div className="flex flex-col gap-2 ">
                                        <div className="text-sm flex flex-col gap-5">
                                            <div className="flex md:flex-row flex-col justify-between gap-1">
                                                <p className="text-lg font-medium text-xl font-serif">Pay with Lightning</p>
                                                <div className="flex gap-2">
                                                    <span className="text-xs text-primary font-mono uppercase">
                                                        FAST • PRIVATE
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-muted-foreground text-xs">Send exactly <span className="font-semibold">{Math.floor(btcAmount * 100_000_000)} sats</span> to complete this payment.</p>

                                            <div className="flex flex-col gap-5">
                                                <div className="p-8 flex justify-center">
                                                    <QRCode size={200} value={paymentRequest.lightningInvoice || ""} />
                                                </div>

                                                <div className="w-full flex justify-between items-center bg-white border rounded-lg px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {shortenAddress(paymentRequest.lightningInvoice || "")}
                                                    </span>

                                                    <Copy
                                                        className="w-4 h-4 cursor-pointer text-primary"
                                                        onClick={() => copy(paymentRequest.lightningInvoice)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </TabsContent>
                                <TabsContent value="btc" className="p-5 bg-white backdrop-blur-sm rounded-xl ">
                                    <div className="flex flex-col gap-2 ">
                                        <div className="text-sm flex flex-col gap-5">
                                            <div className="flex md:flex-row flex-col justify-between gap-1">
                                                <p className="text-lg font-medium text-xl font-serif">Pay with Bitcoin</p>
                                                <div className="flex gap-2">
                                                    <span className="text-xs text-primary font-mono uppercase">
                                                        Secured in ~10min • Final
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-muted-foreground text-xs">Send exactly <span className="font-semibold">{Math.floor(btcAmount * 100_000_000)} sats</span> to complete this payment.</p>

                                            <div className="flex flex-col gap-5">
                                                <div className="p-8 flex justify-center">
                                                    <QRCode size={200} value={paymentRequest.sparkAddress || ""} />
                                                </div>

                                                <div className="w-full flex justify-between items-center bg-white border rounded-lg px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {shortenAddress(paymentRequest.sparkAddress || "")}
                                                    </span>

                                                    <Copy
                                                        className="w-4 h-4 cursor-pointer text-primary"
                                                        onClick={() => copy(paymentRequest.sparkAddress)}
                                                    />
                                                </div>
                                                {!paymentMade && availableWallet && btcAmount > 0 && <div className="flex flex-col gap-2 mt-2">
                                                    <div className="flex items-center gap-5 mb-2">
                                                        <Separator className="flex-1" />
                                                        <span className="text-xs text-muted-foreground">or pay with wallet</span>
                                                        <Separator className="flex-1" />
                                                    </div>
                                                    <div className="flex justify-center"><Button className="flex items-center gap-2 text-xs" onClick={payWithXVerse} disabled={sendLoading}>
                                                        {sendLoading ? <Spinner /> : <span className="flex items-center gap-2"><img src={XVerseWhiteLogo} className="h-3 w-3" />Pay with XVerse</span>}
                                                    </Button>
                                                    </div>
                                                    {sendError && <p className="text-primary text-xs text-center">An error occured: {sendError}</p>}
                                                </div>}
                                                {paymentMade && <div className="flex justify-center"><p className="text-sm text-center bg-primary/20 text-primary px-4 py-2 border-1 border-primary/40 rounded-sm shadow-lg  text-muted-foreground animate-pulse">Your payment is in process and will be completed once confirmed.</p></div>}
                                                <p className="text-xs text-muted-foreground text-center">
                                                    No Spark wallet? Install{" "}
                                                    <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">Xverse</a>,{" "}
                                                    <a href="https://blitzwalletapp.com/" target="_blank" className="text-primary hover:underline">Blitz</a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div >
                </CardContent >
                <CardFooter className="flex justify-center p-5 border-t">
                    <div className='text-xs text-muted-foreground'>© {new Date().getFullYear()} HexQuarter. All rights reserved.</div>
                </CardFooter>
            </Card >
        </div >
    )
}

