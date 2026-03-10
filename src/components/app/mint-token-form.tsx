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
import { PlusCircle } from "lucide-react"
import type React from "react"
import { useState, type FormEvent } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type MintSubmitData = {
    amount: number
}

type Props = {
    onSubmit: (data: MintSubmitData) => Promise<void>
}

export const MintTokenForm: React.FC<Props> = ({ onSubmit, ...props }) => {
    const [amount, setAmount] = useState(0)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onSubmit({ amount })
        setLoading(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen} {...props}>
            <DialogTrigger asChild onClick={() => setOpen(true)}>
                <Button className="w-full xl:w-auto" ><PlusCircle /> Issue receipt </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gray-50">
                <DialogHeader>
                    <DialogTitle>Token minting</DialogTitle>
                    <DialogDescription>Issue loyalty tokens to mint tokens for completed tasks, achievements, or approved work.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => handleSubmit(e)} className="flex flex-col gap-5">
                    <Card>
                        <CardHeader>
                            <CardTitle><Label htmlFor="amount">Amount to mint</Label></CardTitle>
                            <CardDescription>Specify the number of loyalty tokens to issue for the verified work.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4 my-4">
                                <div className="grid gap-3">
                                    <Input required id="amount" type='number' inputMode="numeric" min='0' placeholder='1' onChange={(e) => setAmount(parseFloat(e.target.value))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading} > {loading && <Spinner />} Issue the tokens</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
