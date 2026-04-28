import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { Wallet } from "@/lib/wallet";
import { ArrowUp } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";

export type Asset = {
    name: string
    symbol: string
    max: number,
    identifier?: string
}

export const BTCAsset = { name: "Bitcoin", symbol: "sat", max: 0 } as Asset

type Props = {
    assets: Asset[]
    price: number
    onSend: (method: 'spark' | 'lightning' | 'bitcoin', asset: Asset, amount: number, recipient: string) => Promise<void>
    wallet: Wallet
}

export const Send: React.FC<Props> = ({ wallet, assets, price, onSend }) => {
    const [open, setOpen] = useState(false)
    const [recipient, setRecipient] = useState<undefined | string>(undefined)
    const [amount, setAmount] = useState(0)
    const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [method, setMethod] = useState<'spark' | 'lightning' | 'bitcoin'| undefined>(undefined)
    const [recipientError, setRecipientError] = useState<undefined | string>(undefined)
    const [fee, setFee] = useState<undefined | number>(undefined)
    const [loadingFee, setLoadingFee] = useState(false)

    const handleChangeAmount = async (val: string) => {
        if (!selectedAsset) return
        setFee(undefined)
        const amount = Number(val)
        if (isNaN(amount) || amount == 0) {
            setFee(undefined)
            setAmount(0)
        } else {
            setAmount(amount)
            if (!recipient) return

            try {
                setLoadingFee(true)
                switch (method) {
                    case "spark":
                        if (selectedAsset.symbol == "sat") {
                            const feeSats = await wallet.getTransferFee("spark", recipient, amount)
                            setFee(Number(feeSats))
                        }
                        else {
                            const feeSats = await wallet.getTransferFee("token", recipient, amount, selectedAsset.identifier)
                            setFee(Number(feeSats))
                        }
                        break
                    case "bitcoin":
                        const btcFeeSats = await wallet.getTransferFee("bitcoin", recipient, amount)
                        setFee(Number(btcFeeSats))
                        break
                    case "lightning":
                        const lnFeeSats = await wallet.getTransferFee("lightning", recipient, amount)
                        setFee(Number(lnFeeSats))
                        break
                }

                setLoadingFee(false)
            }
            catch (e) {
                setLoadingFee(false)
            }
        }
    }

    const setMaxAmount = async () => {
        if (!selectedAsset) return
        await handleChangeAmount(selectedAsset.max.toString())
    }

    const handleSend = async () => {
        if (selectedAsset && amount > 0 && recipient && method) {
            setLoading(true)
            try {
                await onSend(method, selectedAsset, amount, recipient)
            }
            catch (e) {
                console.error(e)
            }
            finally {
                setLoading(false)
                setOpen(false)
            }
            cleanUp()
        }
    }

    const handleOpenChange = (open: boolean) => {
        setOpen(open)
        cleanUp()
        setMethod(undefined)
    }

    const cleanUp = () => {
        setSelectedAsset(undefined)
        setAmount(0)
        setRecipient(undefined)
        setRecipientError(undefined)
        setFee(undefined)
    }

    const handleRecipientChange = async (r: string) => {
        setTimeout(async () => {
            setRecipientError(undefined)
            if (r == "") {
                setRecipient(undefined)
                if (method != 'lightning') {
                    setRecipientError('Recipient address is required')
                }
                else {
                    setRecipientError('Recipient invoice or address is required')
                }
                return
            }
            try {
                const recipientType = await wallet.parseRecipient(r)
                if (selectedAsset?.name != 'Bitcoin' && recipientType != 'spark') {
                    setRecipientError('A token transfer requires a Spark address')
                    return
                }
                setMethod(recipientType)
                setRecipient(r)
            }
            catch (e) {
                setRecipientError('Invalid recipient address')
            }
        }, 100)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild onClick={() => handleOpenChange(true)} >
                <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full ring-1 ring-border p-3 text-primary hover:ring-primary hover:cursor-pointer hover:bg-primary/10">
                        <ArrowUp className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">Send</span>
                </div>
            </DialogTrigger>
            <DialogContent className="bg-slate-50 flex flex-col gap-10">
                <DialogHeader>
                    <DialogTitle className="font-serif text-3xl font-light">Send funds</DialogTitle>
                </DialogHeader>
                <Card>
                    {assets.map((asset) => (
                        <div key={asset.symbol} className={`flex items-center gap-2 hover:bg-primary/10 cursor-pointer p-2 rounded-sm ${selectedAsset?.symbol == asset.symbol ? 'bg-primary/10' : ''}`} onClick={() => setSelectedAsset(asset)}>
                            <div className="">
                                {asset.name == 'Bitcoin' && <div className="text-primary"><FaBitcoin className="h-6 w-6" /></div>}
                                {asset.name != 'Bitcoin' && <div className="bg-black p-2 rounded-full"><svg width="10" height="10" viewBox="0 0 68 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M39.7159 25.248L40.8727 0.570312H26.4219L27.5787 25.2483L4.46555 16.5221L0 30.2656L23.8282 36.7915L8.38717 56.0763L20.0781 64.5703L33.6483 43.9245L47.2179 64.5695L58.9089 56.0755L43.4679 36.7909L67.2937 30.2657L62.8281 16.5221L39.7159 25.248ZM33.6472 33.6013L33.647 33.6007H33.6466L33.6462 33.6021L33.6472 33.6013Z" fill="#fff" />
                                </svg></div>}
                            </div>
                            <span className="text-sm text-muted-foreground">{asset.name}</span>
                        </div>
                    ))}

                    {selectedAsset &&
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="address">Recipient address</Label>
                            <Input required id="address" onChange={(e) => handleRecipientChange(e.target.value)} placeholder={`${selectedAsset.name == 'Bitcoin' ? 'Enter address' : 'Enter Spark address'}`} />
                            {recipientError && <p className="text-primary text-xs">{recipientError}</p>}
                        </div>
                    }
                    {selectedAsset && recipient &&
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="amount">Amount of {selectedAsset.symbol} to send</Label>
                            <Input required id="amount" type='number' inputMode="numeric" min={0} onChange={(e) => handleChangeAmount(e.target.value)} placeholder="0" value={amount} />
                            <div className="flex md:flex-row flex-col gap-1 justify-between md:items-center">
                                <div>
                                    {selectedAsset.name == 'Bitcoin' && <span className="text-xs">Sending: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format((amount / 100_000_000) * price)}</span>}
                                </div>
                                <div className="flex gap-1 items-center">
                                    {amount != selectedAsset.max && <Badge className="bg-gray-100 text-gray-400 border-gray-200 font-light pl-2 pr-2 hover:cursor-pointer hover:bg-gray-200 hover:text-gray-500" onClick={() => setMaxAmount()}>Max</Badge>}
                                    <span className="text-xs">{selectedAsset.max} {selectedAsset.symbol} {selectedAsset.name == 'Bitcoin' && <span>({new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format((selectedAsset.max / 100_000_000) * price)})</span>}</span>
                                </div>
                            </div>
                            {amount > selectedAsset.max && <span className="items-center flex text-xs text-primary font-semibold">Insufficient funds. <br />The amount entered is greater than your balance ({selectedAsset.max} {selectedAsset.symbol})</span>}
                            {loadingFee && <span className="text-xs flex items-center gap-2">Estimated fee: <Spinner /></span>}
                            {!loadingFee && fee !== undefined && <span className="text-xs">Estimated fee: {fee} sat ({new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format((fee / 100_000_000) * price)})</span>}
                        </div>
                    }
                </Card>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="bg-white" variant='outline'>Cancel</Button>
                    </DialogClose>
                    {selectedAsset && amount > 0 && amount <= selectedAsset.max && recipient && <Button onClick={handleSend} disabled={loading}>{loading ? <Spinner /> : 'Send'}</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}