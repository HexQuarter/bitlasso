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
import { Label } from "@/components/ui/label"
import type React from "react"
import { useState, type FormEvent } from "react"
import { Spinner } from "@/components/ui/spinner"

export type TransferSubmitData = {
    address: string,
    amount: number
}

type Props = {
    onSubmit: (data: TransferSubmitData) => Promise<void>
}

export const TransferForm: React.FC<Props> = ({ onSubmit }) => {
    const [address, setAddress] = useState("")
    const [amount, setAmount] = useState(0)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onSubmit({ address, amount })
        setLoading(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={() => setOpen(true)} >
                <Button>Transfer</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transfer token</DialogTitle>
                    <DialogDescription>
                        Send tokens to another wallet address
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => handleSubmit(e)}>
                    <div className="flex flex-col gap-4 my-4">
                        <div className="grid gap-3">
                            <Label htmlFor="address">Recipient address</Label>
                            <Input required id="address" onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="amount">Amount</Label>
                            <Input required id="amount" type='number'inputMode="numeric"  min='0' onChange={(e) => setAmount(parseFloat(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading} > { loading && <Spinner />} Confirm the transfer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
