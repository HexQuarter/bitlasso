import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"


import LogoPng from '../../public/logo.svg'
import { fetchPaymentRequest, getBitcoinPrice, type PaymentRequest } from "@/lib/nostr"
import { ExternalLink } from "lucide-react"
import { shortenAddress } from "@/lib/utils"

export const CertPage: React.FC = () => {
    const { id } = useParams()
    const [loading, setLoading] = useState(true)
    const [paymentRequest, setPaymentRequest] = useState<undefined | PaymentRequest>(undefined)
    const [btcAmount, setBtcAmount] = useState(0)
    const [btcAmountDate, setBtcAmoundDate] = useState<undefined | Date>(undefined)
    const [txUrl, setTxUrl] = useState('')
    const [walletUrl, setWalletUrl] = useState('')

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

                if (paymentRequest.settlementMode == 'btc') {
                    setTxUrl(`https://www.blockchain.com/explorer/transactions/btc/${paymentRequest.settleTx}`)
                    setWalletUrl(`https://www.blockchain.com/explorer/addresses/btc/${paymentRequest.btcAddress}`)
                }
                else if (paymentRequest.settlementMode == 'spark') {
                    setTxUrl(`https://sparkscan.io/tx/${paymentRequest.settleTx}`)
                    setWalletUrl(`https://sparkscan.io/address/${paymentRequest.sparkAddress}`)
                }

                setPaymentRequest(paymentRequest)
                setLoading(false)

            })
                .catch(() => {
                    setLoading(false)
                    setFetchError('Payment request is not found.')
                    setFetchErrorDetails('The payment request you are trying to access does not exist. Please check the link or contact the merchant for assistance.')
                })
        }
    }, [])

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
                {!loading && paymentRequest &&
                    <div className="flex flex-col px-5 py-10 px-3 gap-10">
                        <div className='flex flex-col items-center gap-2'>
                            <img src={LogoPng} className='w-10' />
                            <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                                <span className='text-primary'>bit</span>
                                lasso
                            </div>
                        </div>
                        <Card className="gap-0 p-0">
                            <CardHeader className="p-5 flex justify-between border-b border-border/60">
                                <div className="flex flex-col gap-2">
                                    <div className="flex">
                                        <div className="text-xs text-green-800 uppercase font-mono bg-green-600/20 px-2 py-1 border border-green-600/10 rounded-lg flex items-center gap-2 tracking-widest">
                                            <div className="h-2 w-2 bg-green-800 rounded"></div>
                                            Settled
                                        </div>
                                    </div>
                                    <p className="font-serif text-xl">Payment request certificate</p>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-10 px-5 py-5 border-b border-border/60">
                                <div className="flex flex-col gap-5">
                                    <span className="font-mono uppercase text-muted-foreground text-xs">Payment details</span>
                                    <div className="grid lg:grid-cols-2 gap-5 flex-col justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-muted-foreground text-xs">Amount (USD)</span>
                                            <p className="text-xs font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-muted-foreground text-xs">Amount (BTC)</span>
                                            <p className="text-xs font-mono">{btcAmount} BTC</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-muted-foreground text-xs">Settled on</span>
                                            <p className="text-xs font-mono">{btcAmountDate?.toDateString()}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-muted-foreground text-xs">Network</span>
                                            <p className="text-xs font-mono">{paymentRequest.settlementMode}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-muted-foreground text-xs">Description</span>
                                            <p className="text-xs font-mono">{paymentRequest.description || 'No description provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="px-5 py-5">
                                <div className="flex flex-col gap-5">
                                    <span className="font-mono uppercase text-muted-foreground text-xs">Settlement</span>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-muted-foreground text-xs">Transaction ID</span>
                                        <a href={txUrl} target="_blank" className="flex items-center gap-2 text-primary  text-xs font-mono">{shortenAddress(paymentRequest.settleTx as string)} <ExternalLink className="h-4" /></a>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-muted-foreground text-xs">Destination wallet</span>
                                        <a href={walletUrl} target="_blank" className="text-xs font-mono text-primary flex items-center gap-2">{paymentRequest.settlementMode == 'btc' ? shortenAddress(paymentRequest.btcAddress) : shortenAddress(paymentRequest.sparkAddress)} <ExternalLink className="h-4" /></a>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>}
            </div>
        </div>

        // <div className="flex min-h-dvh flex-col items-center justify-center p-6 md:p-10 bg-slate-50">
        //     <div className="w-full max-w-sm md:max-w-6xl ">
        //         <div className="text-2xl mb-5 flex flex-col lg:flex-row justify-between items-center">
        //             <a href='/'>
        //                 <div className='flex items-center gap-2'>
        //                     <img src={LogoPng} className='w-10' />
        //                     <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
        //                         <span className='text-primary'>bit</span>
        //                         lasso
        //                     </div>
        //                 </div>
        //             </a>

        //         </div>
        //         <div className="flex flex-col gap-6">
        //             {!loading && !fetchError && <h1 className="text-5xl font-bold font-serif font-light">Payment request certificate</h1>}
        //             <Card className="lg:p-10">
        //                 <CardHeader>
        //                     {loading && <p className="flex items-center gap-2 text-primary text-sm">Fetching payment details... <Spinner /></p>}
        //                     {!loading && fetchError && <h1 className="text-4xl text-black font-serif">{fetchError}</h1>}
        //                 </CardHeader>
        //                 <CardContent className="flex flex-col lg:flex-row">
        //                     {!loading && fetchErrorDetails && <p className="text-gray-500">{fetchErrorDetails}</p>}
        //                     {!loading && paymentRequest && (
        //                         <div className="flex lg:flex-row flex-col justify-between w-full gap-10">
        //                             <div className="flex flex-col gap-5 lg:p-5">
        //                                 <h2 className="font-mono text-sm font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">Payment details</h2>
        //                                 <div className="flex flex-col gap-1">
        //                                     <span className="text-xl">Amount</span>
        //                                     <div className="flex flex-col gap-1 text-muted-foreground">
        //                                         <span className="font-medium flex flex-col text-sm gap-1">
        //                                             {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount + (paymentRequest.redeemAmount || 0))}
        //                                             <span className="text-xs font-light">(Received: {btcAmount} BTC on {btcAmountDate?.toDateString()})</span></span>
        //                                     </div>
        //                                 </div>
        //                                 <div className="flex flex-col gap-1">
        //                                     <span className="text-xl">Description</span>
        //                                     <span className="text-sm text-muted-foreground">{paymentRequest.description || 'No description provided'}</span>
        //                                 </div>
        //                                 {paymentRequest.redeemTx &&
        //                                     <div className="flex flex-col gap-1">
        //                                         <div className="mt-2 flex flex-col gap-2">
        //                                             <span className="text-xl">Loyalty discount</span>
        //                                             <div className="flex flex-col gap-2 text-muted-foreground">
        //                                                 <p className="text-sm">A discount have been applied after redeeming of {paymentRequest.redeemAmount} tokens, reducing the amount to: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount)}</p>
        //                                                 Transaction: <a href={`https://sparkscan.io/tx/${paymentRequest.redeemTx}`} target="_blank" className="text-sm text-muted-foreground flex items-center gap-2">{shortenAddress(paymentRequest.redeemTx as string)} <ExternalLink className="h-4" /></a>
        //                                             </div>
        //                                         </div>
        //                                     </div>
        //                                 }
        //                                 <div className="flex flex-col gap-1">
        //                                     <span className="text-xl">Settlement</span>
        //                                     <div className="flex flex-col gap-2">
        //                                         <p className="text-sm text-muted-foreground">Payment have been made on: {paymentRequest.settlementMode.toUpperCase()}</p>
        //                                         <p className="text-sm text-muted-foreground">Transaction: <a href={txUrl} target="_blank" className="flex items-center gap-2">{shortenAddress(paymentRequest.settleTx as string)} <ExternalLink className="h-4" /></a></p>
        //                                         <p className="text-sm text-muted-foreground">Destination wallet:
        //                                             <a href={walletUrl} target="_blank" className="text-sm text-muted-foreground flex items-center gap-2">{paymentRequest.settlementMode == 'btc' ? shortenAddress(paymentRequest.btcAddress) : shortenAddress(paymentRequest.sparkAddress)} <ExternalLink className="h-4" /></a>
        //                                         </p>
        //                                     </div>
        //                                 </div>
        //                             </div>
        //                         </div>
        //                     )}
        //                 </CardContent>
        //             </Card>
        //             <p className="text-xs text-center text-slate-600">If you encounter any issue, please reach us to <a href='mailto:bitlasso@hexquarter.com'>bitlasso@hexquarter.com</a></p>
        //         </div>
        //     </div>
        // </div >
    )
}