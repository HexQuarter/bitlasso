import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { fetchPaymentRequest, fetchSettingsByPubkey, getBitcoinPrice, RelayConfig, subscribeRedeem, type PaymentRequest } from "@bitlasso/sdk"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router"

import { toast } from "sonner"

import LogoPng from '../../../public/logo.svg'

import { PaymentCertificate } from "@/components/payment/payment-certificate"
import { PaymentForm, type PaymentConfirmation } from "@/components/payment/payment-form"

export const PaymentPage: React.FC = () => {

    const relayConfig = new RelayConfig({ dev: import.meta.env.DEV })

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
            fetchPaymentRequest(relayConfig, id).then(async (paymentRequest) => {
                setLoading(false)
                if (!paymentRequest.vat) {
                    const userSettings = await fetchSettingsByPubkey(relayConfig, paymentRequest.pubkey)
                    if (userSettings?.org?.vat) {
                        paymentRequest.vat = userSettings.org.vat
                    }
                }

                setPaymentRequest(paymentRequest)

                if (paymentRequest.settleTx) {
                    getBitcoinPrice(relayConfig, paymentRequest.id).then(priceDetails => {
                        if (!priceDetails) {
                            return
                        }
                        setBtcAmount(Math.round((paymentRequest.amount / priceDetails.usdPrice) * 100000000) / 100000000)
                        setBtcAmountDate(priceDetails.date)
                    })
                }

                if (!paymentRequest.redeemAmount) {
                    subscribeRedeem(relayConfig, paymentRequest.id, () => {
                        toast.success('Token have been redeemed. You can proceed to the payment with the discount applied')
                        fetchPaymentRequest(relayConfig, paymentRequest.id).then(paymentRequest => {
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
        getBitcoinPrice(relayConfig, paymentRequest!.id).then(priceDetails => {
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
            <div className="">
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
                    <div className="lg:w-1/2 mx-auto">
                        <ErrorState error={fetchError} errorDetails={fetchErrorDetails} />
                    </div>
                }

                {!loading && !fetchError && paymentRequest && paymentRequest.settleTx && btcAmountDate &&
                    <PaymentDetails state={"settled"} relayConfig={relayConfig} paymentRequest={paymentRequest} btcAmount={btcAmount} btcAmountDate={btcAmountDate} />
                }

                {!loading && !fetchError && paymentRequest && !paymentRequest.settleTx &&
                    <PaymentDetails state={"pending"} relayConfig={relayConfig} paymentRequest={paymentRequest} handleConfirmation={handleConfirmation} />
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

type PaymentDetailsProps =
    { state: "pending", relayConfig: RelayConfig, paymentRequest: PaymentRequest, handleConfirmation: (confirmation: PaymentConfirmation) => void }
    | {
        state: "settled",
        relayConfig: RelayConfig,
        paymentRequest: PaymentRequest,
        btcAmount: number
        btcAmountDate: Date
    }

const PaymentDetails: React.FC<PaymentDetailsProps> = (props) => {
    const { state, relayConfig, paymentRequest } = props

    const redeemDetails = useMemo(() => {
        return paymentRequest.redeemTx ? { redeemAmount: paymentRequest.redeemAmount as number, redeemTransaction: paymentRequest.redeemTx as string } : undefined
    }, [paymentRequest])

    return (
        <div className="min-h-screen bg-neutral-50 flex mx-auto md:flex-row flex-col 2xl:w-1/2 gap-10">
            <div className="flex flex-col gap-5 lg:w-2/4 p-6 ">
                <div className='flex items-center gap-2 hover:cursor-pointer justify-center mb-10' onClick={() => window.open('/?utm_source=bitlasso.xyz&utm_medium=payment_page', 'blank')} >
                    <img src={LogoPng} className='w-8' />
                    <div className='font-serif tracking-tighter text-foreground flex items-center'>
                        <p className="flex gap-2 items-end">
                            <span className="text-3xl"><span className="text-primary">bit</span>lasso</span>
                        </p>
                    </div>
                </div>
                <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-widest font-light">{paymentRequest.orgDetails ? 'Pay to' : ''}</span>
                    <div className="text-2xl text-black font-serif break-all flex flex-col">
                        <span>{paymentRequest.orgDetails ? paymentRequest.orgDetails.name : ''}</span>
                    </div>
                </div>
                <hr />
                <div className="flex flex-col gap-5">
                    <span className="text-xs text-neutral-400 uppercase tracking-widest font-light">Items</span>
                    {paymentRequest.items && paymentRequest.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-start bg-white rounded-lg p-4 border border-primary/40 gap-5">
                            <div className="flex flex-col gap-1">
                                <p className="font-medium text-black">{item.title}</p>
                                {<p className="text-muted-foreground/80 text-sm">{item.description || 'No description'}</p>}
                            </div>
                            <p className="font-semibold black ml- 2">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
                            </p>
                        </div>
                    ))}
                </div>
                <hr />
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-black font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}</span>
                    </div>
                    {redeemDetails && <div className="flex justify-between text-sm">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground">Applied discount</span>
                            <a className="text-xs text-neutral-400 italic hover:text-primary" href={`https://sparkscan.io/tx/${redeemDetails?.redeemTransaction}`} target="_blank">
                                See transaction
                            </a>
                        </div>
                        <span className="text-black font-semibold">-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(redeemDetails?.redeemAmount || 0)}</span>
                    </div>}
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT ({paymentRequest.vat}%)</span>
                        <span className="text-black font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount * (paymentRequest.vat / 100))}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span className="">Total due</span>
                        <span className="text-black font-semibold text-primary text-lg">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount * (paymentRequest.vat && paymentRequest.vat > 0 ? 1 + (paymentRequest.vat / 100) : 1))}
                        </span>
                    </div>
                </div>

            </div>
            <div className="flex flex-col lg:w-2/4 bg-white p-6 gap-10 rounded-lg my-10 border-border/40 border shadow-lg">
                {state == 'pending' && <PaymentForm relayConfig={relayConfig} paymentRequest={paymentRequest} handleConfirmation={props.handleConfirmation} />}
                {state == 'settled' && <PaymentCertificate paymentRequest={paymentRequest} btcAmountDate={props.btcAmountDate} />}
            </div>
        </div>
    )
}

