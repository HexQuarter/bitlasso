import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AssetSelector } from "./asset-selector";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { Wallet } from "@/lib/wallet";
import { ArrowUp } from "lucide-react";

export type Asset = {
    name: string
    symbol: string
    max: number,
    identifier?: string
}

export const BTCAsset = { name: "Bitcoin", symbol: "BTC" } as Asset

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
    const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0])
    const [loading, setLoading] = useState(false)
    const [method, setMethod] = useState<'spark' | 'lightning' | 'bitcoin'>('spark')
    const [recipientError, setRecipientError] = useState<undefined | string>(undefined)
    const [fee, setFee] = useState<undefined | number>(undefined)
    const [loadingFee, setLoadingFee] = useState(false)

    useEffect(() => {
        setSelectedAsset(assets[0])
    }, [assets])

    const handleSelectedAsset = (asset: Asset) => {
        setSelectedAsset(asset)
        setAmount(0)
        setFee(undefined)
    }

    const handleChangeAmount = async (val: string) => {
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
                        if (selectedAsset.symbol == "BTC") {
                            const feeSats = await wallet.getTransferFee("spark", recipient, amount * 100_000_000)
                            setFee((Number(feeSats) / 100_000_000))
                        }
                        else {
                            const feeSats = await wallet.getTransferFee("token", recipient, amount * 100_000_000, selectedAsset.identifier)
                            setFee((Number(feeSats) / 100_000_000))
                        }
                        break
                    case "bitcoin":
                        const btcFeeSats = await wallet.getTransferFee("bitcoin", recipient, amount * 100_000_000)
                        setFee((Number(btcFeeSats) / 100_000_000))
                        break
                    case "lightning":
                        const lnFeeSats = await wallet.getTransferFee("lightning", recipient, amount * 100_000_000)
                        setFee((Number(lnFeeSats) / 100_000_000))
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
        await handleChangeAmount(selectedAsset.max.toString())
    }
    const onTabChange = (value: string) => {
        setMethod(value as 'spark' | 'lightning' | 'bitcoin')
        cleanUp()
    }

    const handleSend = async () => {
        if (amount > 0 && recipient) {
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
        setMethod('spark')
    }

    const cleanUp = () => {
        setSelectedAsset(assets[0])
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
                const validAddress = await wallet.validAddress(r, method)
                if (!validAddress) {
                    if (method != 'lightning') {
                        setRecipientError('Invalid recipient address')
                    }
                    else {
                        setRecipientError('Invalid recipient invoice/address')
                    }
                    return
                }
                setRecipient(r)
            }
            catch (e) {
                if (method != 'lightning') {
                    setRecipientError('Invalid recipient address')
                }
                else {
                    setRecipientError('Invalid recipient invoice/address')
                }
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
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <Card>
                    <Tabs defaultValue="spark" className="flex flex-col gap-10" onValueChange={onTabChange} value={method}>
                        <TabsList className="bg-transparent p-0 border-border/40 border-b-1 w-full">
                            <TabsTrigger value={"spark"} className="font-mono uppercase text-xs p-5 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300">Spark</TabsTrigger>
                            <TabsTrigger value={"lightning"} className="font-mono uppercase text-xs p-5 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300">Lightning</TabsTrigger>
                            <TabsTrigger value={"bitcoin"} className="font-mono uppercase text-xs p-5 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300">Bitcoin</TabsTrigger>
                        </TabsList>
                        <TabsContent value="spark" className="flex flex-col gap-5">
                            <h2 className="font-semibold text-xl">Send via Spark</h2>
                            <p className="text-muted-foreground text-sm">Instant and free transfers between Spark users with complete privacy.</p>
                            <div className="flex flex-col gap-5 w-full">
                                <AssetSelector assets={assets} onSelected={handleSelectedAsset} />
                                <div className="flex flex-col gap-4 my-4">
                                    <div className="grid gap-3">
                                        <Label htmlFor="address">Recipient address</Label>
                                        <Input required id="address" onChange={(e) => handleRecipientChange(e.target.value)} placeholder="spark...." />
                                        {recipientError && <p className="text-primary text-xs">{recipientError}</p>}
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="amount">Amount of {selectedAsset.symbol} to send</Label>
                                        <Input required id="amount" type='number' inputMode="numeric" min={0} onChange={(e) => handleChangeAmount(e.target.value)} placeholder="0" value={amount} />
                                        <div className="flex md:flex-row flex-col gap-1 justify-between md:items-center">
                                            <div>
                                                {selectedAsset.symbol == 'BTC' && <span className="text-xs">Sending: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(amount * price)}</span>}
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                {amount != selectedAsset.max && <Badge className="bg-gray-100 text-gray-400 border-gray-200 font-light pl-2 pr-2 hover:cursor-pointer hover:bg-gray-200 hover:text-gray-500" onClick={() => setMaxAmount()}>Max</Badge>}
                                                <span className="text-xs">{selectedAsset.max} {selectedAsset.symbol} {selectedAsset.symbol == 'BTC' && <span>({new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(selectedAsset.max * price)})</span>}</span>
                                            </div>
                                        </div>
                                        {amount > selectedAsset.max && <span className="items-center flex text-xs text-primary font-semibold">Insufficient funds. <br />The amount entered is greater than your balance ({selectedAsset.max} {selectedAsset.symbol})</span>}
                                        {loadingFee && <span className="text-xs flex items-center gap-2">Estimated fee: <Spinner /></span>}
                                        {!loadingFee && fee !== undefined && <span className="text-xs">Estimated fee: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(fee * price)}</span>}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="lightning" className="flex flex-col gap-5">
                            <h2 className="font-semibold text-xl">Send via Lightning</h2>
                            <p className="text-muted-foreground text-sm">Fast global payments, reaching any Lightning wallet worldwide.</p>
                            <div className="flex flex-col gap-5 w-full">
                                <div className="flex flex-col gap-4 my-4">
                                    <div className="grid gap-3">
                                        <Label htmlFor="address">Invoice or address</Label>
                                        <Input required id="address" onChange={(e) => handleRecipientChange(e.target.value)} placeholder="ln...." />
                                        {recipientError && <p className="text-primary text-xs">{recipientError}</p>}
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="amount">Amount of BTC to send</Label>
                                        <Input required id="amount" type='number' inputMode="numeric" min={0} onChange={(e) => handleChangeAmount(e.target.value)} placeholder="0" value={amount} />
                                        <div className="flex md:flex-row flex-col gap-1 justify-between md:items-center">
                                            <div>
                                                <span className="text-xs">Sending: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(amount * price)}</span>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                {amount != selectedAsset.max && <Badge className="bg-gray-100 text-gray-400 border-gray-200 font-light pl-2 pr-2 hover:cursor-pointer hover:bg-gray-200 hover:text-gray-500" onClick={() => setMaxAmount()}>Max</Badge>}
                                                <span className="text-xs">{selectedAsset.max} {selectedAsset.symbol} <span>({new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(selectedAsset.max * price)})</span></span>
                                            </div>
                                        </div>
                                        {amount > selectedAsset.max && <span className="items-center flex text-xs text-primary font-semibold">Insufficient funds. <br />The amount entered is greater than your balance ({selectedAsset.max} {selectedAsset.symbol})</span>}
                                        {loadingFee && <span className="text-xs flex items-center gap-2">Estimated fee: <Spinner /></span>}
                                        {!loadingFee && fee !== undefined && <span className="text-xs">Estimated fee: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(fee * price)}</span>}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="bitcoin" className="flex flex-col gap-5">
                            <h2 className="font-semibold text-xl">Send via Bitcoin</h2>
                            <p className="text-muted-foreground text-sm">Secure on-chain settlement with maximum security and global accessibility.</p>
                            <div className="flex flex-col gap-5 w-full">
                                <div className="flex flex-col gap-4 my-4">
                                    <div className="grid gap-3">
                                        <Label htmlFor="address">Recipient address</Label>
                                        <Input required id="address" onChange={(e) => handleRecipientChange(e.target.value)} placeholder="bc...." />
                                        {recipientError && <p className="text-primary text-xs">{recipientError}</p>}
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="amount">Amount of BTC to send</Label>
                                        <Input required id="amount" type='number' inputMode="numeric" min={0} onChange={(e) => handleChangeAmount(e.target.value)} placeholder="0" value={amount} />
                                        <div className="flex md:flex-row flex-col gap-1 justify-between md:items-center">
                                            <div>
                                                <span className="text-xs">Sending: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(amount * price)}</span>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                {amount != selectedAsset.max && <Badge className="bg-gray-100 text-gray-400 border-gray-200 font-light pl-2 pr-2 hover:cursor-pointer hover:bg-gray-200 hover:text-gray-500" onClick={() => setMaxAmount()}>Max</Badge>}
                                                <span className="text-xs">{selectedAsset.max} {selectedAsset.symbol} <span>({new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(selectedAsset.max * price)})</span></span>
                                            </div>
                                        </div>
                                        {amount > selectedAsset.max && <span className="items-center flex text-xs text-primary font-semibold">Insufficient funds. <br />The amount entered is greater than your balance ({selectedAsset.max} {selectedAsset.symbol})</span>}
                                        {loadingFee && <span className="text-xs flex items-center gap-2">Estimated fee: <Spinner /></span>}
                                        {!loadingFee && fee !== undefined && <span className="text-xs">Estimated fee: {new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(fee * price)}</span>}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </Card>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button className="bg-white" variant='outline'>Cancel</Button>
                    </DialogClose>
                    {amount > 0 && amount <= selectedAsset.max && recipient && <Button onClick={handleSend} disabled={loading}>{loading ?  <Spinner /> : 'Send' }</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}