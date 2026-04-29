import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getPaymentPrice, parseLightningInvoiceAmount } from "@/lib/api"
import { formatTime } from "@/lib/utils"
import { CheckCircle, Copy, GiftIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"

import { getProviders } from "sats-connect";
import { toast } from "sonner"

import LogoPng from '../../public/logo.svg'
import { fetchPaymentRequest, getBitcoinPrice, subscribePayment, subscribeRedeem, type OrgSettings, type PaymentRequest } from "@/lib/nostr"
import QRCode from "react-qr-code"

import { LoyaltySection } from "@/components/payment/loyalty-section"
import { PaidRequest } from "@/components/payment/paid-request"
import { Slider } from "@/components/ui/slider"

type PaymentConfirmation = { transaction: string, settlementMode: string, btcAmount: number }

export const PaymentPage: React.FC = () => {
    const { id } = useParams()
    const [loading, setLoading] = useState(true)

    const [paymentRequest, setPaymentRequest] = useState<undefined | PaymentRequest>(undefined)

    const [fetchError, setFetchError] = useState<string>("")
    const [fetchErrorDetails, setFetchErrorDetails] = useState<string>("")

    const [btcAmount, setBtcAmount] = useState(0)
    const [btcAmountDate, setBtcAmountDate] = useState<undefined | Date>(undefined)

    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;

        if (id && !paymentRequest) {
            fetchPaymentRequest(id).then(async (paymentRequest) => {
                setLoading(false)
                setPaymentRequest(paymentRequest)

                if (paymentRequest.settleTx) {
                    getBitcoinPrice(paymentRequest.id).then(priceDetails => {
                        if (!priceDetails) {
                            return
                        }
                        setBtcAmount(Math.round((paymentRequest.amount / priceDetails.usdPrice) * 100000000) / 100000000)
                        setBtcAmountDate(priceDetails.date)
                    })
                }

                if (!paymentRequest.redeemAmount) {
                    subscribeRedeem(paymentRequest.id, () => {
                        toast.success('Token have been redeemed. You can proceed to the payment with the discount applied')
                        fetchPaymentRequest(paymentRequest.id).then(paymentRequest => {
                            setPaymentRequest(paymentRequest)
                        })
                    })
                }
            })
                .catch((e) => {
                    console.error(e)
                    setLoading(false)
                    setFetchError('Payment request is not found.')
                    setFetchErrorDetails('The payment request you are trying to access is not accessible. Please check the link or contact the merchant for assistance. If the issue persists please contact us for additional support.')
                })
        }
    }, [])

    const handleConfirmation = (confirmation: PaymentConfirmation) => {
        if (!paymentRequest) return
        getBitcoinPrice(paymentRequest!.id).then(priceDetails => {
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
            <div className="lg:w-1/2 mx-auto">
                {loading &&
                    <div className="flex min-h-screen">
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

                {!loading && !fetchError && paymentRequest && !paymentRequest.settleTx &&
                    <PendingPaymentState paymentRequest={paymentRequest} handleConfirmation={handleConfirmation} />
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
            <CardContent className="mt-10 flex flex-col gap-1">
                {errorDetails.split('.').filter(s => s).map((s, i) => (
                    <p className="text-gray-500" key={i}>{s}.</p>
                ))}
            </CardContent>
            <CardFooter className=" mt-10">
                <p className="text-xs text-slate-600">If the issue persists, you can <a href='mailto:bitlasso@hexquarter.com' className="underline">contact us</a> for additional support.</p>
            </CardFooter>
        </Card>
    </div>
)

const PendingPaymentState: React.FC<{
    paymentRequest: PaymentRequest,
    handleConfirmation: (confirmation: PaymentConfirmation) => void,
}> = ({ paymentRequest, handleConfirmation }) => {

    const [remainingRefreshTime, setRemainingRefreshTime] = useState(0)
    const [btcAmount, setBtcAmount] = useState(0)
    const [lightningInvoice, setLightningInvoice] = useState<string>(paymentRequest.lightningInvoice)

    const [redeemDetails, setRedeemDetails] = useState<{ redeemAmount: number, redeemTransaction: string } | undefined>(paymentRequest.redeemTx ? { redeemAmount: paymentRequest.redeemAmount as number, redeemTransaction: paymentRequest.redeemTx as string } : undefined)
    const [availableWallet, setAvailableWallet] = useState<boolean>(false)

    const [tokenMetadata, setTokenMetadata] = useState<{ ticker: string } | undefined>(undefined)

    useEffect(() => {
        const response = getProviders()
        if (response.length > 0) {
            setAvailableWallet(true)
        }

        void (() => {
            fetch(`https://api.sparkscan.io/v1/tokens/${paymentRequest.tokenId}`)
                .then(async (r) => {
                    if (r.ok) {
                        const { metadata } = await r.json()
                        if (metadata) {
                            setTokenMetadata({ ticker: metadata.ticker })
                        }
                    }
                })
                .catch(console.error)
        })()

        subscribePayment(paymentRequest.id, (transaction: string, settlementMode: string) => {
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
        const toastId = toast.info('Address copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
        setCopied(true)
    }

    const maxRedeemable = !redeemDetails ? paymentRequest.amount * (paymentRequest.discountRate / 100) : 0
    const maxRedeemableToken = Math.floor(Math.max(0, maxRedeemable))
    const [copied, setCopied] = useState(false);
    const [openedLoyalty, setOpenLoyalty] = useState(false)

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
                        <span className="text-xs text-neutral-400">{paymentRequest.orgDetails?.name ? 'Requesting payment from' : 'Payment request'}</span>
                        <h1 className="text-lg text-muted-foreground">{paymentRequest.orgDetails ? (paymentRequest.orgDetails as OrgSettings).name : ''}</h1>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {paymentRequest.description && paymentRequest.description != '' && <div className="space-y-1 text-center">
                            <div className="text-sm text-neutral-500">Description</div>
                            <div className="text-sm italic">{paymentRequest.description || ''}</div>
                        </div>}
                        <div className="space-y-1 text-center">
                            <div className="text-sm text-neutral-500">Amount</div>
                            <div className="text-3xl font-semibold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}
                            </div>
                            <div className="flex justify-center items-center gap-2">
                                <span className="text-xs text-neutral-400">Net: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}</span>
                                <span className="text-xs text-neutral-400">{paymentRequest.orgDetails
                                    ? paymentRequest.vat !== undefined ? ` VAT: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount * (1 + (paymentRequest.vat / 100)))} (${paymentRequest.vat}%)` : ''
                                    : ''
                                }</span>
                            </div>
                            <div className="text-xs text-neutral-500 flex justify-center flex-col">
                                {btcAmount > 0 &&
                                    `${Math.floor(btcAmount * 100_000_000)} sats • ${btcAmount} BTC`
                                }
                                {btcAmount == 0 && <span className="flex justify-center items-center gap-2"><Spinner /> Fetch Bitcoin price</span>}
                                {remainingRefreshTime !== undefined && remainingRefreshTime > 0 &&
                                    <div className="flex flex-col gap-2 mt-5 w-1/2 justify-center mx-auto">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-muted-foreground">Price refreshes in {formatTime(remainingRefreshTime)}</p>
                                        </div>
                                        <Slider max={60 * 5} min={0} value={[remainingRefreshTime > 0 ? 60 * 5 - remainingRefreshTime : 0]} className="" withThumb={false} />
                                    </div>
                                }
                            </div>
                        </div>

                        {redeemDetails &&
                            <div className="text-center space-y-1">
                                <p className="text-sm text-neutral-500">Loyalty program </p>
                                <div className="flex flex-col gap-2 text-center">
                                    <p className="">
                                        Redemption of {" "}
                                        <span className="font-semibold">{redeemDetails?.redeemAmount || 0} {tokenMetadata ? tokenMetadata.ticker : 'token'} (= ${redeemDetails?.redeemAmount || 0} off)</span>.
                                    </p>
                                    <a className="text-xs text-neutral-400" href={`https://sparkscan.io/tx/${redeemDetails.redeemTransaction}`} target="_blank">
                                        Check out transaction
                                    </a>
                                </div>
                            </div>}

                        <div className="flex justify-center">
                            <div className="w-48 h-48 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 text-xs text-center p-4">
                                <QRCode value={lightningInvoice} />
                            </div>
                        </div>

                        {/* Invoice */}
                        <div className="space-y-2">
                            <div className="text-xs text-neutral-500">Scan or copy to pay the invoice</div>
                            <div className="flex items-center justify-between bg-neutral-50 border rounded-lg px-3 py-2">
                                <div className="text-xs font-mono text-neutral-700 truncate">
                                    {lightningInvoice}
                                </div>
                                <button
                                    onClick={() => copy(lightningInvoice)}
                                    className="text-neutral-500 hover:text-black"
                                >
                                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            {copied && (
                                <div className="text-xs text-green-600">Copied to clipboard</div>
                            )}
                        </div>

                        {/* CTA */}
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => window.open("lightning:" + lightningInvoice)}>
                                Pay with Lightning
                            </Button>
                            {maxRedeemableToken > 0 && !openedLoyalty &&
                                <Button variant={'outline'} className="flex-1" onClick={() => setOpenLoyalty(true)}><GiftIcon className="text-primary" /> Save up to {paymentRequest.discountRate}%</Button>
                            }
                        </div>

                        {openedLoyalty &&
                            <LoyaltySection
                                paymentRequest={paymentRequest}
                                handleRedeem={((transaction, amount) => setRedeemDetails({ redeemAmount: amount, redeemTransaction: transaction }))}
                                maxRedeemableToken={maxRedeemableToken}
                                availableWallet={availableWallet}
                            />}
                    </CardContent>
                    <CardFooter className="justify-center flex flex-col gap-5 pb-2" >
                        <p className="text-xs text-neutral-400">Encounter any problem? <a href="mailto:bitlasso@hexquarter.com" target="_blank" className="underline">Contact us</a></p>
                        <p className="text-xs text-neutral-400">By <a href="https://hexquarter.com?utm_source=bitlasso.xyz&utm_medium=payment_page" target="_blank" className="underline">HexQuarter</a> - All rights reserved © {new Date().getFullYear()}</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

