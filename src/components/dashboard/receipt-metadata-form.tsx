import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PaymentRequestItem } from "./payment-table"

export type ReceiptMetadataData = {
    transactionId: string,
    description?: string
    recipientAddress?: string
    paymentId?: string
}

type Props = {
    paymentRequests: PaymentRequestItem[]
    metadata: ReceiptMetadataData,
    onSubmit: (data: ReceiptMetadataData) => Promise<void>
    onClose: () => void
}

export const ReceiptMetadataForm: React.FC<Props> = ({ metadata, onSubmit, onClose, paymentRequests }) => {
    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)

    const [description, setDescription] = useState(metadata.description || '')
    const [paymentId, setPaymentId] = useState(metadata.paymentId || undefined)

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        let newMetadata = metadata
        newMetadata.description = description
        newMetadata.paymentId = paymentId
        await onSubmit(newMetadata)
        setLoading(false)
        setOpen(false)
    }, [metadata, description, paymentId])

    useEffect(() => {
        if (!open) onClose()
    }, [open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px] bg-slate-50">
                <DialogHeader className="">
                    <DialogTitle className="text-slate-800 text-2xl pb-2 flex items-center gap-2 font-serif text-2xl font-normal"><Edit className="text-primary" />Update receipt's metadata</DialogTitle>
                    <DialogDescription className="flex flex-col gap-2">
                        You can define metadata related to minted receipts. This would help you for audit and history.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => handleSubmit(e)}>
                    <div className="flex flex-col gap-4 my-4">
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Project Description</CardTitle>
                                <CardDescription className="text-xs">Describe the work that was completed. This creates a clear, auditable record tied to the issued receipt.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Textarea id="description" onChange={(e) => setDescription(e.target.value)} placeholder="Frontend delivery for Project Alpha" value={description} />
                            </CardContent>
                        </Card>
                        <Card className="grid gap-3">
                            <CardHeader>
                                <CardTitle className="font-semibold text-black">Payment</CardTitle>
                                <CardDescription className="text-xs">Is it associated to a payment ?</CardDescription>
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
                        <Button type="submit" disabled={loading} > {loading ? <Spinner /> : 'Update receipt metadata'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}