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
import { Coins, Plus, X } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrgSettings, Settings } from "@bitlasso/sdk"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Spinner } from "../ui/spinner"

export type LineItem = {
    id: string
    title: string
    description: string
    amount: number
}

export type PaymentRequestData = {
    items: LineItem[]
    discountRate: number
}

type Props = {
    settings: Settings
    onSubmit: (data: PaymentRequestData) => Promise<void>
    price: number
    orgSettings?: OrgSettings
}

export const PaymentRequestForm: React.FC<Props> = ({ onSubmit, orgSettings }) => {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [items, setItems] = useState<LineItem[]>([{ id: '1', title: '', description: '', amount: 0 }])
    const [ready, setReady] = useState(false)
    const [discountRate, setDiscountRate] = useState(0)

    const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items])
    const vatRate = useMemo(() => orgSettings?.vat || 0, [orgSettings])

    const [allowDiscount, setAllowDiscount] = useState(false)

    const handleChangeAmount = (val: string, itemId: string) => {
        const amount = parseFloat(val)
        const newItems = items.map(item =>
            item.id === itemId ? { ...item, amount: Number.isNaN(amount) ? 0 : amount } : item
        )
        setItems(newItems)
        setReady(newItems.some(item => item.amount > 0))
    }

    const handleChangeTitle = (val: string, itemId: string) => {
        const newItems = items.map(item =>
            item.id === itemId ? { ...item, title: val } : item
        )
        setItems(newItems)
        setReady(newItems.some(item => item.amount > 0 && item.title.trim()))
    }

    const handleChangeDescription = (val: string, itemId: string) => {
        const newItems = items.map(item =>
            item.id === itemId ? { ...item, description: val } : item
        )
        setItems(newItems)
    }

    const handleAddItem = () => {
        const newId = Math.random().toString(36).substr(2, 9)
        setItems([...items, { id: newId, title: '', description: '', amount: 0 }])
    }

    const handleRemoveItem = (itemId: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== itemId))
        }
    }

    const handleDiscountChange = (val: string) => {
        const amount = parseInt(val)
        if (Number.isNaN(amount)) {
            setDiscountRate(0)
            return
        }
        setDiscountRate(amount)
    }

    const validItems = items.filter(item => item.title.trim() && item.amount > 0)

    const handleActivatePayment = async () => {
        try {
            setLoading(true)
            await onSubmit({
                items: validItems,
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
            setItems([{ id: '1', title: '', description: '', amount: 0 }])
            setReady(false)
            setAllowDiscount(false)
            setDiscountRate(10)
        }
        setOpen(open)
    }

    const handleActiveDiscount = (value: boolean) => {
        setAllowDiscount(value)
        if (value && discountRate == 0) {
            setDiscountRate(10)
        }
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
                            <CardTitle className="text-lg font-semibold text-black">Line items</CardTitle>
                            <CardDescription className="">Add items to charge for.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex gap-2 items-start">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <Input
                                            placeholder="Item title (e.g., 'Frontend delivery')"
                                            value={item.title}
                                            onChange={(e) => handleChangeTitle(e.target.value, item.id)}
                                        />
                                        <Textarea
                                            placeholder="Item description (optional, e.g., 'Project Alpha - 40 hours of frontend work')"
                                            value={item.description}
                                            onChange={(e) => handleChangeDescription(e.target.value, item.id)}
                                            className="min-h-16 resize-none"
                                        />
                                        <Input
                                            type='number'
                                            inputMode="decimal"
                                            min='0'
                                            step='0.01'
                                            placeholder='Amount (USD)'
                                            onChange={(e) => handleChangeAmount(e.target.value, item.id)}
                                            value={item.amount || ''}
                                        />
                                    </div>
                                    {items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="mt-2"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddItem}
                                className="w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </CardFooter>
                    </Card>
                    {validItems.length > 0 && (
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-black">Items Summary</CardTitle>
                                <CardDescription className="">Review items to charge for.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 border rounded-lg p-3 bg-neutral-50">
                                    {validItems.map((item) => (
                                        <div key={item.id} className="flex justify-between items-start pb-2 last:pb-0 last:border-b-0 border-b border-neutral-200">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                                                {item.description && <p className="text-xs text-neutral-600">{item.description}</p>}
                                            </div>
                                            <p className="text-sm font-semibold text-neutral-900 ml-2">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card className="bg-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-black">Total Amount</CardTitle>
                            <CardDescription className="">Total amount in USD for all items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</p>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-5 items-start">
                            {vatRate == 0 && <p className="text-xs text-gray-400">No VAT applied.</p>}
                            {vatRate > 0 && <p className="text-xs text-gray-400">Total amount (with VAT): {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount * (1 + (vatRate / 100)))}</p>}
                            <p className="text-xs text-gray-400">A BTC payment equivalent will be present and refreshed on the checkout page matching the most recent rate.</p>
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-black">Loyalty rewards</CardTitle>
                            <CardDescription>
                                Let customers earn and redeem loyalty tokens for discounts on future purchases.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-5">
                            <div className="flex gap-2 bg-gray-50 p-2 border border-border rounded-lg">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="allow-discount" className="hover:cursor-pointer">Enable token redemption</Label>
                                    <p className="text-xs text-muted-foreground">Customers can use their loyalty tokens to reduce the total at checkout.</p>
                                </div>
                                <Switch checked={allowDiscount} onCheckedChange={handleActiveDiscount} id="allow-discount" />
                            </div>
                            {allowDiscount &&
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-muted-foreground">Set the maximum percentage discount customers can unlock using tokens.</p>
                                    <Input type="number" min="0" max="100" step="5" value={discountRate} onChange={(e) => handleDiscountChange(e.target.value)} />
                                    <p className="text-xs text-gray-400">Example: For a $1000 order, customers could redeem up to ${(1000 - (1000 * (1 - discountRate / 100))).toFixed(2)} in discounts.</p>
                                </div>
                            }
                        </CardContent>
                    </Card>
                    {ready && <DialogFooter >
                        <Button onClick={handleActivatePayment} className="w-full">{loading ? <Spinner /> : 'Create'}</Button>
                    </DialogFooter>}
                    <DialogClose asChild><Button variant="outline" className="w-full bg-white" onClick={() => setLoading(false)}>Cancel</Button></DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}
