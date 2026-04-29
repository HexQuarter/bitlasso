import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import { useMemo, useState } from "react"
import type { Wallet } from "@/lib/wallet"
import { purchaseCredits, type Settings } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import { send } from "@/lib/utils"
import { BTCAsset } from "./send"


const USD_FEE = 1

function usdToBtc(usd: number, btcPriceUsd: number) {
    // btcPriceUsd = USD per 1 BTC
    return Math.floor(usd * 100_000_000 / btcPriceUsd) / 100_000_000;
}

type Props = {
    settings: Settings
    loading: boolean
    price: number
    creditBalance?: number,
    satsBalance: number,
    onSubmit(feeSats?: number, credits?: number): void
    onPurchaseCredits: (amount: number) => Promise<void>
}

export type Bundle = {
    id: string
    label: string
    quantity: number
    priceEach: number
    savings: number
}

const purchaseBundle = async (settings: Settings, wallet: Wallet, price: number, bundle: Bundle) => {
    const amount = bundle.priceEach * bundle.quantity
    const sats = usdToBtc(amount, price) * 100_000_000
    const paymentId = await send(wallet, BTCAsset, sats, settings.address, 'spark')
    console.log(paymentId)
    const { transferId } = await purchaseCredits(bundle.id, wallet)
    console.log('Purchase tx id', transferId)
};

export const ActivePayment: React.FC<Props> = ({ settings, loading, price, onSubmit, onPurchaseCredits, satsBalance, creditBalance = 0 }) => {
    const { wallet } = useWallet()
    const singleFeeSats = useMemo(() => usdToBtc(USD_FEE, price) * 100_000_000, [price])
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
            await purchaseBundle(settings, wallet, price, selectedBundle);
            await onPurchaseCredits(selectedBundle.quantity)
            setBalance((prev) => prev + selectedBundle.quantity);
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
            onSubmit(singleFeeSats)
        }
        else {
            onSubmit(undefined, 1)
        }
    }

    return (
        <div className={`overflow-hidden rounded-2xl p-0 bg-background transition-all duration-1000 delay-200 w-full flex flex-col gap-2 shadow-xl`}>
            <div className="flex flex-col gap-2">
                <p className="font-medium text-muted-foreground text-center text-sm px-5 py-2 bg-gray-100 border rounded-tr-2xl rounded-tl-2xl">Checkout page activation</p>
            </div>
            <div className="flex flex-col px-5 py-2">
                <header className="flex md:flex-row flex-col justify-between">
                    <p className="text-sm font-bold">Cost: 1 credit (~$1)</p>
                    <div className="flex flex-col md:gap-1 gap-5 md:items-end">
                        <p className="md:text-end text-sm">Your got <span className="text-primary">{balance}</span> credits</p>
                        {view != 'buy' && <div><Button variant="outline" className="text-sm h-0 py-3 px-3" onClick={() => setView('buy')}>Buy more credits  - save up to 25%</Button></div>}
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
                <div className="py-8 flex justify-center gap-2 px-5 flex-col items-center">
                    <Button className="w" onClick={handleActivate} disabled={loading || (satsBalance < usdToBtc(USD_FEE, price) * 100_000_000 && creditBalance == 0)}>
                        {loading ? <Spinner /> : `Activate for ${balance == 0 ? `~${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(USD_FEE)} (${usdToBtc(USD_FEE, price) * 100_000_000} sats)` : '1 credit'}`}
                    </Button>
                    {(satsBalance < usdToBtc(USD_FEE, price) * 100_000_000 && creditBalance == 0) && <p className="text-sm text-foreground/80">Insufficient balance.</p>}
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