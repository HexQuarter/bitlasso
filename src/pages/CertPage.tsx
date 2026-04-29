import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"


import LogoPng from '../../public/logo.svg'
import { fetchPaymentRequest, getBitcoinPrice, type PaymentRequest } from "@/lib/nostr"
import { useSettings } from "@/hooks/use-settings"
import { PaidRequest } from "@/components/payment/paid-request"

export const CertPage: React.FC = () => {
    const { id } = useParams()
    const { settings } = useSettings()
    const [loading, setLoading] = useState(true)
    const [paymentRequest, setPaymentRequest] = useState<undefined | PaymentRequest>(undefined)
    const [btcAmount, setBtcAmount] = useState(0)
    const [btcAmountDate, setBtcAmoundDate] = useState<undefined | Date>(undefined)

    const [fetchError, setFetchError] = useState<string>("")
    const [fetchErrorDetails, setFetchErrorDetails] = useState<string>("")

    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        if (id) {
            fetchPaymentRequest(id).then(async (paymentRequest) => {
                if (!paymentRequest.settleTx) {
                    setLoading(false)

                    setFetchError("Payment request pending.")
                    setFetchErrorDetails("You cannot generate a certificate without settlement.")
                    return
                }

                const priceDetails = await getBitcoinPrice(id)
                if (!priceDetails) {
                    return
                }
                setBtcAmount(Math.round((paymentRequest.amount / priceDetails.usdPrice) * 100000000) / 100000000)
                setBtcAmoundDate(priceDetails.date)

                setPaymentRequest(paymentRequest)
                setLoading(false)

            })
                .catch(() => {
                    setLoading(false)
                    setFetchError('Payment request is not found.')
                    setFetchErrorDetails('The payment request you are trying to access does not exist. Please check the link or contact the merchant for assistance.')
                })
        }
    }, [settings])

    return (
        <div className="bg-gray-50 h-screen">
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
                            <p className='mt-10 text-primary font-mono uppercase text-xs animate-[bounce_0.8s_ease-in-out_infinite]'>Payment certificate sync...</p>
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
                            <CardFooter className="flex justify-center">
                                <p className="text-xs text-center text-slate-600"><a href='mailto:bitlasso@hexquarter.com'>support</a></p>
                            </CardFooter>
                        </Card>
                    </div>
                }
                {!loading && paymentRequest &&
                    <PaidRequest paymentRequest={paymentRequest} btcAmount={btcAmount} btcAmountDate={btcAmountDate} />
                }
            </div>
        </div >
    )
}