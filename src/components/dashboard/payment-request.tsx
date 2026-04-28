import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Coins, Plus } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivePayment } from "./activate-payment"
import type { Settings } from "@/lib/api"
import type { OrgSettings } from "@/lib/nostr"

export type PaymentRequestData = {
    description?: string
    amount: number
    feeSats?: number
    credits?: number
    discountRate: number
}

type Props = {
    settings: Settings
    onSubmit: (data: PaymentRequestData) => Promise<void>
    onPurchaseCredits: (amount: number) => Promise<void>
    price: number
    creditBalance: number
    satsBalance: number
    orgSettings?: OrgSettings
}

export const PaymentRequestForm: React.FC<Props> = ({ onSubmit, price, settings, creditBalance, satsBalance, onPurchaseCredits, orgSettings }) => {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [amount, setAmount] = useState(0)
    const [description, setDescription] = useState("")
    const [ready, setReady] = useState(false)
    const [discountRate, setDiscountRate] = useState(10)
 
    const vatRate = useMemo(() => orgSettings?.vat || 0, [orgSettings])

    const handleChangeAmount = (val: string) => {
        const amount = parseFloat(val)
        if (Number.isNaN(amount)) {
            setReady(false)
            return
        }
        setReady(amount > 0)
        setAmount(amount)
    }

    const handleDiscountChange = (val: string) => {
        const amount = parseInt(val)
        if (Number.isNaN(amount)) {
            setDiscountRate(10)
            return
        }
        setDiscountRate(amount)
    }

    const handleActivatePayment = async (feeSats?: number, credits?: number) => {
        try {
            setLoading(true)
            await onSubmit({
                amount,
                description,
                feeSats,
                credits,
                discountRate
            })
            setLoading(false)
            setOpen(false)
        }
        catch (e) {
            setLoading(false)
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setAmount(0)
            setDescription("")
            setReady(false)
        }
        setOpen(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild onClick={() => setOpen(true)} >
                <Button className="flex gap-2 has-[>svg]:pr-5 bg-primary hover:bg-black w-full lg:w-auto"><Plus className="h-4 w-4" />New payment request</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-hidden bg-slate-50 overflow-y-auto">
                <DialogHeader className="">
                    <DialogTitle className="text-2xl pb-2 flex items-center gap-2 font-serif font-light"><Coins className="text-primary" />Create payment request</DialogTitle>
                    <DialogDescription className="flex flex-col gap-2">
                        Request a Bitcoin payment for completed work.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 my-4">
                    <Card className="bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-black">Amount</CardTitle>
                            <CardDescription className=" text-muted-foreground">Enter the amount in USD for the payment request.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input required id="amount" type='number' inputMode="numeric" min='0' placeholder='0' onChange={(e) => handleChangeAmount(e.target.value)} value={amount} />
                        </CardContent>
                        <CardFooter className="flex flex-col gap-5 items-start">
                            {vatRate > 0 && <p className="text-xs text-gray-400">Total amount (with VAT): {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount * (1 + (vatRate / 100)))}</p>}
                            <p className="text-xs text-gray-400">A BTC payment equivalent will be present and refreshed on the checkout page matching the most recent rate.</p>
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-black">Description (optional)</CardTitle>
                            <CardDescription className="">What is this payment for ?</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Textarea id="description" onChange={(e) => setDescription(e.target.value)} placeholder="Frontend delivery for Project Alpha" value={description} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-black">Discount percentage</CardTitle>
                            <CardDescription className="">What is the maximum discount (%) a customer can receive by redeeming tokens?</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Input type="number" min="0" max="100" step="5" value={discountRate} onChange={(e) => handleDiscountChange(e.target.value)} />
                            <p className="text-xs text-gray-400">For exemple with a $1000 request, customer could have a max discount of ${1000 - (1000 * (1 - discountRate / 100))}</p>
                        </CardContent>
                    </Card>
                    {ready && <DialogFooter>
                        <ActivePayment settings={settings} loading={loading} price={price} onSubmit={handleActivatePayment} creditBalance={creditBalance} onPurchaseCredits={onPurchaseCredits} satsBalance={satsBalance} />
                    </DialogFooter>}
                    <DialogClose asChild><Button variant="outline" className="w-full bg-white" onClick={() => setLoading(false)}>Cancel</Button></DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}
