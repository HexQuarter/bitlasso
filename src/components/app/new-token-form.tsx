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
import { Coins } from "lucide-react"
import type React from "react"
import { useState, type FormEvent } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type SubmitData = {
    symbol: string,
    name: string
}

type Props = {
    onSubmit: (data: SubmitData) => Promise<void>
}

export const NewTokenForm: React.FC<Props> = ({ onSubmit }) => {
    const [name, setName] = useState("")
    const [symbol, setSymbol] = useState("")
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)

        await onSubmit({ name, symbol })
        setLoading(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={() => setOpen(true)} >
                <Button className="bg-black hover:bg-primary w-full lg:w-auto">Create token</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-50">
                <DialogHeader>
                    <DialogTitle className="text-2xl pb-2 flex items-center gap-2 font-serif font-light"><Coins className="text-primary" />Token issuance</DialogTitle>
                    <DialogDescription>
                        Deploy a new loyalty token to issue receipts for completed work.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => handleSubmit(e)}>
                    <div className="flex flex-col gap-4 my-4">
                        <Card className="grid gap-3">
                            <CardHeader>
                                <Label htmlFor="name" className="text-lg font-semibold">Token name</Label>
                                <p className="text-muted-foreground text-sm">Define a name for your token to be recognized by your customers</p>
                            </CardHeader>
                            <CardContent>
                                <Input id="name" onChange={(e) => setName(e.target.value)} placeholder="Token name (e.g. Apple)" />
                            </CardContent>
                        </Card>
                        <Card className="grid gap-3">
                            <CardHeader>
                                <Label htmlFor="symbol" className="text-lg font-semibold">Token ticker</Label>
                                <p className="text-muted-foreground text-sm">Define a ticker symbol for your token</p>
                            </CardHeader>
                            <CardContent>
                                <Input id="symbol" onChange={(e) => setSymbol(e.target.value)} placeholder="Token symbol (e.g. AAPL)" />
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" >Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading} > {loading ? <Spinner /> : 'Create the token'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
