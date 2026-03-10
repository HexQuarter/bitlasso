import { type ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import React, { useCallback, useState } from "react"
import { Copy, ExternalLink, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ReceiptMetadataForm, type ReceiptMetadataData } from "./receipt-metadata-form"
import type { Payment } from "./payment-table"
import { toast } from "sonner"
import { shortenAddress } from "@/lib/utils"

export type Receipt = {
    date: Date
    recipient?: string
    amount: number
    transaction: string
    description?: string
    paymentId?: string
}

const getColumns = (openMetadataModalFn: (metadata: ReceiptMetadataData) => void, paymentRequests: Payment[]) => {
    return [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => {
                const date: Date = row.original.date
                return date.toLocaleString()
            }
        },
        {
            accessorKey: "amount",
            header: "Amount"
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => {
                return row.original.description || "N/A"
            }
        },
        {
            accessorKey: "recipient",
            header: "Recipient",
            cell: ({ row }) => {
                const recipient = row.original.recipient
                if (recipient) {
                    const copyWallet = () => {
                        if (!recipient) return
                        navigator.clipboard.writeText(recipient)
                        const toastId = toast.info('Wallet address copied into the clipboard')
                        setTimeout(() => {
                            toast.dismiss(toastId)
                        }, 2000)
                    }

                    return (
                        <div className="flex flex-col gap-1">
                            {recipient && <p className="text-xs text-gray-500 flex items-center gap-2">
                                {shortenAddress(recipient)}
                                <Copy className="text-xs w-4" onClick={copyWallet} />
                            </p>}
                        </div>
                    )
                }
            }
        },
        {
            accessorKey: "paymentId",
            header: "Payment",
            cell: ({ row }) => {
                const paymentId: string | undefined = row.original.paymentId
                if (paymentId) {
                    const paymentInfo = paymentRequests.find(p => p.id == paymentId)
                    if (!paymentInfo) {
                        return
                    }
                    const paymentFormat = `${new Intl.NumberFormat("en-US", { style: 'currency', currency: 'USD' }).format(paymentInfo.amount)} on ${paymentInfo.createdAt.toLocaleDateString()}`
                    return <span>{paymentFormat}</span>
                }
            }
        },
        {
            accessorKey: "actions",
            header: "",
            cell: ({ row }) => {
                const tx: string = row.original.transaction

                let metadata: ReceiptMetadataData = { transactionId: tx, description: row.original.description, paymentId: row.original.paymentId }
                if (row.original.recipient) {
                    const address = row.original.recipient
                    metadata.recipientAddress = address
                }
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" id={`receipt-${tx}-menu-button`}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openMetadataModalFn(metadata)}>
                                Edit metadata
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`https://sparkscan.io/tx/${tx}`, '_blank')}>
                                Open issuance transaction <ExternalLink />
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ] as ColumnDef<Receipt>[]
}

export const ReceiptTable: React.FC<{ receipts: Receipt[], paymentRequests: Payment[], onMetadataChange: (modalData: ReceiptMetadataData) => Promise<void> }> = ({ receipts, paymentRequests, onMetadataChange }) => {

    const [openMetadataModal, setOpenMetadataModel] = useState(false)
    const [metadata, setMetadata] = useState<ReceiptMetadataData>({ transactionId: '', description: '', recipientAddress: undefined, paymentId: undefined })

    const showMetadataModal = useCallback((metadata: ReceiptMetadataData) => {
        setMetadata(metadata)
        setOpenMetadataModel(true)
    }, [metadata])

    return (
        <div>
            <DataTable columns={getColumns(showMetadataModal, paymentRequests)} data={receipts} />
            {openMetadataModal && <ReceiptMetadataForm onSubmit={onMetadataChange} metadata={metadata} onClose={() => setOpenMetadataModel(false)} paymentRequests={paymentRequests} />}
        </div>
    )
}