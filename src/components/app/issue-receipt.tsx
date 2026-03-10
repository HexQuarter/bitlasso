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
import { Coins } from "lucide-react"
import type React from "react"
import { useEffect, useState, type FormEvent } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Payment } from "./payment-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWallet } from "@/hooks/use-wallet"

export type IssueReceiptData = {
    description?: string
    recipientAddress?: string
    paymentId?: string
    mintableTokens: number
}

type Props = {
    buttonText?: string
    amount?: number
    description?: string
    paymentId?: string,
    paymentRequests: Payment[],
    onSubmit: (data: IssueReceiptData) => Promise<void>
    buttonVariant?: "default" | "link" | "destructive" | "outline" | "secondary" | "ghost" | 'none'
}

export const IssueReceiptForm: React.FC<Props> = ({ onSubmit, paymentRequests, buttonText = 'New receipt', buttonVariant = 'outline', amount, description, paymentId }) => {
    const { wallet } = useWallet()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [_amount, setAmount] = useState(amount || 0)
    const [_description, setDescription] = useState(description || "")
    const [recipientAddress, setRecipientAddress] = useState("")
    const [recipientError, setRecipientError] = useState<undefined | string>(undefined)
    const [mintableTokens, setMintableTokens] = useState(0)
    const [_paymentId, setPaymentId] = useState(paymentId || undefined)

    useEffect(() => {
        if (_amount > 0) {
            setMintableTokens(Math.floor(_amount))
        }
    }, [_amount])

    const handleChangeAmount = (val: string) => {
        const amount = parseFloat(val)
        if (Number.isNaN(amount)) {
            setAmount(0)
            setMintableTokens(0)
            return
        }
        setAmount(amount)
    }

    const handleRecipientAddressChange = async (r: string) => {
        if (!wallet) return

        setTimeout(async () => {
            setRecipientError(undefined)
            if (r == "") {
                setRecipientAddress("")
                return
            }
            try {
                const validAddress = await wallet.validAddress(r, 'spark')
                if (!validAddress) {
                    setRecipientError('Invalid recipient. Please make sure it is a valid Spark address')
                    return
                }
                setRecipientAddress(r)
            }
            catch (e) {
                setRecipientError('Invalid recipient. Please make sure it is a valid Spark address')
            }
        }, 100)
    }


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onSubmit({
            mintableTokens,
            description: _description,
            recipientAddress,
            paymentId: _paymentId
        })
        setLoading(false)
        setOpen(false)
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={() => setOpen(true)} >
                <div>
                    {buttonVariant != 'none' && <Button className='lg:w-auto w-full' variant={buttonVariant || 'default'}>{buttonText}</Button>}
                    {buttonVariant == 'none' && <Button variant='ghost' className="justify-start pl-2 w-full text-primary">{buttonText}</Button>}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden bg-slate-50 overflow-y-auto">
                <DialogHeader className="">
                    <DialogTitle className="text-slate-800 text-2xl pb-2 flex items-center gap-2"><Coins className="text-primary" />Issue receipt</DialogTitle>
                    <DialogDescription className="flex flex-col gap-2">
                        Create a receipt for a paid work -- redeemable loyalty token to engage your customer.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => handleSubmit(e)}>
                    <div className="flex flex-col gap-4 my-4">
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Receipt value</CardTitle>
                                <CardDescription className="text-xs">Represents completed work. Redeemable according to your terms for discounting.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input required id="amount" type='number' inputMode="numeric" min='0' placeholder='0' onChange={(e) => handleChangeAmount(e.target.value)} value={_amount} />
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <span className="text-right text-xs text-gray-400">{_amount} $ </span>
                                <span className="text-right text-xs text-gray-400">{mintableTokens} mintable tokens </span>
                            </CardFooter>
                        </Card>
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Project description</CardTitle>
                                <CardDescription className="text-xs">Describe the work that was completed. This creates a clear, auditable record tied to the issued receipt.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Textarea id="description" onChange={(e) => setDescription(e.target.value)} placeholder="Frontend delivery for Project Alpha" value={_description} />
                            </CardContent>
                        </Card>
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Recipient</CardTitle>
                                <CardDescription className="text-xs">Who should receive this receipt ?</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Input id="address" type="text" placeholder="Spark Wallet address" onChange={(e) => handleRecipientAddressChange(e.target.value)} />
                                {recipientError && <p className="text-primary text-xs">{recipientError}</p>}
                            </CardContent>
                        </Card>
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Payment</CardTitle>
                                <CardDescription className="text-xs">Can we associate a payment to this receipt?</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Select onValueChange={setPaymentId} value={paymentId}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a payment request" /></SelectTrigger>
                                    <SelectContent>
                                        {paymentRequests.map((p, i) => (
                                            <SelectItem key={i} value={p.id}>{new Intl.NumberFormat("en-US", { style: 'currency', currency: 'USD' }).format(p.amount)} on {p.createdAt.toLocaleDateString()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="bg-white">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading} > {loading && <Spinner />} Issue Receipt</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
