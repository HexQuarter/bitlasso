import { Check } from "lucide-react"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import { useMemo, useState } from "react"
import type { Wallet } from "@/lib/wallet"
import { purchaseCredits, type Settings } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import { send } from "@/lib/utils"
import { BTCAsset } from "./send"


const included = [
    "Payment page generation",
    "Multi payment support: Spark, Lightning, Bitcoin",
    "Client redemption flow",
    "No custody of funds"
]

const USD_FEE = 1

function usdToBtc(usd: number, btcPriceUsd: number) {
    // btcPriceUsd = USD per 1 BTC
    return Math.floor(usd * 100_000_000 / btcPriceUsd) / 100_000_000;
}

type Props = {
    settings: Settings
    loading: boolean
    price: number
    creditBalance?: number
    onSubmit(feeBtc?: number, credits?: number): void
}

export type Bundle = {
    id: string
    label: string
    quantity: number
    priceEach: number
    savings: number
}

const purchaseBundle = async (wallet: Wallet, price: number, bundle: Bundle, bitlassoAddress: string) => {
    const amount = bundle.priceEach * bundle.quantity
    const btc = usdToBtc(amount, price)
    const paymentId = await send(wallet, BTCAsset, btc, bitlassoAddress, 'spark')
    console.log(paymentId)
    const walletAddress = await wallet.getSparkAddress()
    const { transferId} = await purchaseCredits(paymentId, bundle.quantity, walletAddress)
    console.log(transferId)
    return { newBalance: bundle.quantity };
};

export const ActivePayment: React.FC<Props> = ({ settings, loading, price, onSubmit, creditBalance = 0 }) => {
    const { wallet } = useWallet()
    const singleFeeBtc = useMemo(() => usdToBtc(USD_FEE, price), [price])
    const [view, setView] = useState("activate"); // "activate" | "buy"
    const [selectedBundle, setSelectedBundle] = useState<Bundle | undefined>(undefined);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<"success" | "error" | undefined>(undefined);
    const [statusMessage, setStatusMessage] = useState("");
    const [balance, setBalance] = useState<number>(creditBalance)

    const handlePurchase = async () => {
        if (!wallet) return
        if (!selectedBundle) return;
        setProcessing(true);
        try {
            const res = await purchaseBundle(wallet, price, selectedBundle,  settings.address);
            setBalance((prev) => prev + res.newBalance);
            setStatus("success");
            setStatusMessage(`${selectedBundle.quantity} credit${selectedBundle.quantity > 1 ? "s" : ""} added.`);
            setTimeout(() => {
                setStatus(undefined);
                setView("activate");
                setSelectedBundle(undefined);
            }, 1600);
        } catch {
            setStatus("error");
            setStatusMessage("Purchase failed. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    const handleActivate = () => {
        if (balance == 0) {
            onSubmit(singleFeeBtc)
        }
        else {
            onSubmit(undefined, 1)
        }
    }

    return (
        <div className={`overflow-hidden rounded-2xl p-0 bg-background transition-all duration-1000 delay-200 w-full flex flex-col gap-2`}>
            <div className="flex flex-col gap-2 py-2">
                <p className="font-medium font-mono text-primary uppercase text-xs px-5 py-2">Activate payment request</p>
            </div>
            <div className="flex flex-col px-5">
                <header className="flex justify-between">
                    <p className="text-sm font-bold">Cost 1 credit (~$1)</p>
                    <div className="flex flex-col gap-2 items-end">
                        <p className="text-end text-xs">Your got <span className="text-primary">{balance}</span> credits</p>
                        {view != 'buy' && <Button variant="outline" className="text-xs h-0 py-3 px-3" onClick={() => setView('buy')}>Buy more credits  - save up to 25%</Button>}
                    </div>
                </header>
                {view == 'buy' && <BuyBundleView
                    bundles={settings.bundles}
                    selectedBundle={selectedBundle}
                    setSelectedBundle={setSelectedBundle}
                    onPurchase={handlePurchase}
                    processing={processing}
                    status={status}
                    statusMessage={statusMessage}
                />}
                <p className="text-xs mt-5 mb-5">This includes: </p>
                {included.map((item, i) => (
                    <div
                        key={item}
                        className={`flex items-center gap-4 py-2 ${i < included.length - 1 ? "border-b border-border/20" : ""}`}
                    >
                        <div className="flex items-center justify-center rounded-full bg-primary/10 p-1">
                            <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-xs text-foreground/80">{item}</span>
                    </div>
                ))}

                <div className="py-8 flex flex-col gap-2 px-5">
                    <Button className="w-full" onClick={handleActivate}>
                        {loading ? <Spinner /> : `Activate for ${balance == 0 ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(USD_FEE)} (${singleFeeBtc} BTC)` : '1 credit'}`}
                    </Button>
                </div>
            </div>

        </div>
    )
}

const BuyBundleView: React.FC<{
    bundles: Bundle[]
    onPurchase(): void,
    selectedBundle?: Bundle,
    setSelectedBundle(b: Bundle): void
    processing: boolean,
    status?: string,
    statusMessage: string
}> = ({ bundles, onPurchase, selectedBundle, setSelectedBundle, processing, status, statusMessage }) => {
    return (
        <div className="flex flex-col gap-2 py-5">
            <header className="flex justify-between ">
                <p className="text-sm">Choose a bundle. Credits never expire.</p>
            </header>
            <div className="grid grid-cols-4 gap-5">
                {bundles.map((b) => (
                    <div onClick={() => setSelectedBundle(b)} key={b.id} className={`bg-primary/5 rounded-lg border-1 border-primary/10 p-2 col-span-2 text-center text-sm flex flex-col gap-2 ${selectedBundle && selectedBundle.id == b.id ? 'bg-primary/10 border-primary/50' : ''}`}>
                        <p className="font-mono uppercase font-bold">{b.quantity}-pack</p>
                        <p><span className="text-primary font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(b.priceEach)}</span><span className="text-xs text-muted-foreground">/page</span></p>
                        <p className="text-muted-foreground text-xs">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(b.priceEach * b.quantity)}</p>
                        <div><span className="bg-green-200 border-1 p-1 rounded-sm text-xs text-green-800 font-semibold">-{b.savings}%</span></div>
                    </div>
                ))}
            </div>
            <div className="py-8 flex flex-col gap-2">
                {status && (
                    <div className={`text-xs font-semibold border-1 p-1 rounded-sm ${status === "success" ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {statusMessage}
                    </div>
                )}
                {status != 'success' &&
                    <Button className="w-full" onClick={onPurchase} variant='outline' disabled={!selectedBundle || processing}>
                        {processing ? <Spinner /> : `Purchase${selectedBundle ? ` · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedBundle.quantity * selectedBundle.priceEach)} (${selectedBundle.quantity} credits)` : ""}`}
                    </Button>
                }
            </div>
        </div>
    )
}