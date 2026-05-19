import { type ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import React from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CiMenuKebab } from "react-icons/ci";

export type PaymentRequestItem = {
    createdAt: Date
    amount: number
    description?: string
    items?: Array<{ title: string, description?: string, amount: number }>
    settleTx?: string,
    discountRate: number,
    redeemAmount?: number,
    redeemTx?: string,
    id: string
    settlementMode?: string
    sharingKey?: string
}

const getColumns = () => {
    return [

        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }) => {
                const date: Date = row.original.createdAt
                return date.toLocaleString()
            }
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => {
                return (
                    <div className="flex gap-1">
                        {row.original.redeemAmount && <span className={row.original.redeemTx ? 'line-through' : ''}>
                            {Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(row.original.amount + row.original.redeemAmount)}
                        </span>}
                        <span>
                            {Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(row.original.amount)}
                        </span>
                    </div>
                )
            }
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => {
                return row.original.description ? row.original.description : "N/A"
            }
        },
        {
            accessorKey: "discount_rate",
            header: "Discount rate",
            cell: ({ row }) => {
                const discount_rate: number = row.original.discountRate
                return `${discount_rate}%`
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                return (
                    <div className="flex gap-2">
                        {row.original.redeemTx &&
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-xs text-white bg-black/70 pl-2 pr-2 pt-1 pb-1 rounded items-center flex">Discounted</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{`${row.original.redeemAmount} tokens have been redeemed.`}</p>
                                </TooltipContent>
                            </Tooltip>
                        }

                        {row.original.settlementMode &&
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-xs text-green-600 bg-green-600/20 pl-2 pr-2 pt-1 pb-1 rounded">Settled</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{`Payment have been settled on ${row.original.settlementMode.toUpperCase()}.`}</p>
                                </TooltipContent>
                            </Tooltip>
                        }
                        {!row.original.settlementMode &&
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-xs text-yellow-500 bg-yellow-500/20 pl-2 pr-2 pt-1 pb-1 rounded">Pending</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{`Payment is not yet settled. A settlement transaction is required to finalize this payment.`}</p>
                                </TooltipContent>
                            </Tooltip>}
                    </div >
                )
            }
        },
        {
            accessorKey: "actions",
            header: "",
            cell: ({ row }) => {
                const settleTx: string | undefined = row.original.settleTx
                let settleTxUrl: string | undefined
                if (settleTx) {
                    switch (row.original.settlementMode) {
                        case "spark":
                            settleTxUrl = `https://sparkscan.io/tx/${settleTx}`
                            break
                        case "btc":
                            settleTxUrl = `https://www.blockchain.com/explorer/transactions/btc/${settleTx}`
                            break
                        default:
                            return <></>
                    }
                }

                const redeemTx: string | undefined = row.original.redeemTx
                let redeemTxUrl: string | undefined
                if (redeemTx) {
                    redeemTxUrl = `https://sparkscan.io/tx/${redeemTx}`
                }

                const paymentPageLink = row.original.sharingKey ? `#/payment/${row.original.id}?key=${row.original.sharingKey}` : `#/payment/${row.original.id}`

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex gap-1 items-center">
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-transparent hover:cursor-pointer">
                                    <CiMenuKebab className={`h-4 w-4`} />
                                </Button>

                                <span className="sr-only">Open menu</span>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!row.original.settleTx && <DropdownMenuItem onClick={() => window.open(paymentPageLink, '_blank')}>Open payment's page <ExternalLink /></DropdownMenuItem>}
                            {settleTxUrl && <DropdownMenuItem onClick={() => window.open(settleTxUrl, '_blank')}>Open settlement transaction <ExternalLink /></DropdownMenuItem>}
                            {redeemTxUrl && <DropdownMenuItem onClick={() => window.open(redeemTxUrl, '_blank')}>Open redeem transaction <ExternalLink /></DropdownMenuItem>}
                            {row.original.settleTx && <DropdownMenuItem onClick={() => window.open(paymentPageLink, '_blank')}>Open payment certificate<ExternalLink /></DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }

    ] as ColumnDef<PaymentRequestItem>[]
}

type Props = {
    data: PaymentRequestItem[]
}

export const PaymentTable: React.FC<Props> = ({ data }) => {
    return (
        <DataTable columns={getColumns()} data={data} />
    )
}