import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Receive } from "./receive"
import { Send, type Asset } from "./send"
import type { Addresses } from "@/hooks/use-wallet"
import type { SparkPayment, Wallet } from "@/lib/wallet"
import { ExternalLink, MoreHorizontal, Wallet2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../ui/chart"
import { Area, AreaChart, CartesianGrid } from "recharts"
import { useMemo } from "react"

type Token = {
    id: string
    name: string
    symbol: string
    amount: number
}

type Props = {
    addresses: Addresses
    btcBalance: number
    tokens: Token[]
    price: number
    currency: string
    onSend: (method: 'spark' | 'lightning' | 'bitcoin', asset: Asset, amount: number, recipient: string) => Promise<void>
    payments: ExtendedPayment[]
    wallet: Wallet
}

type ExtendedPayment = SparkPayment & {
    url?: string
}

const chartConfig = {
    sats: {
        label: "Sats"
    },
    balance: {
        label: "Balance"
    }
} satisfies ChartConfig

export const WalletCard: React.FC<Props> = ({ btcBalance, tokens, addresses, price, currency, onSend, payments, wallet }) => {
    const assets: Asset[] = [
        { name: "Bitcoin", symbol: "BTC", max: btcBalance },
        ...tokens.map((t) => {
            return {
                name: t.name,
                max: t.amount,
                symbol: t.symbol,
                identifier: t.id
            } as Asset
        })
    ]

    const currencyFormat = new Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: currency });

    const history = useMemo(() => {
        return payments
            // .filter(p => p.status == 'completed' && p.method != 'token')
            .sort((a, b) => a.timestamp - b.timestamp)
            .reduce<{ date: string, sats: number, amount: number }[]>((acc, p) => {
                if (acc.length == 0) {
                    acc.push({
                        date: new Date(p.timestamp * 1000).toISOString().split('T')[0],
                        sats: Number(p.amount),
                        amount: (Number(p.amount) / 100_000_000) * price
                    })
                }
                else {
                    const lastItem = acc[acc.length - 1]
                    const sats = p.direction == 'INCOMING' ? lastItem.sats + Number(p.amount) : lastItem.sats - Number(p.amount)
                    acc.push({
                        date: new Date(p.timestamp * 1000).toISOString().split('T')[0],
                        sats: sats,
                        amount: (sats / 100_000_000) * price
                    })
                }
                return acc
            }, [])
    }, [payments])

    return (
        <Card className="h-full">
            <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <div className="bg-primary/10 p-3 rounded-full items-center"><Wallet2 className="h-4 w-4 text-primary" /></div>
                    Wallet
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex gap-1 items-center">
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <span className="sr-only">Open menu</span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`https://sparkscan.io/address/${addresses.spark}`, '_blank')}>View history<ExternalLink /></DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <div className="border-primary/40 flex flex-col gap-2">
                    <span className="text-2xl font-semibold">{currencyFormat.format(btcBalance * price)}</span>
                    <span className="text-xs text-muted-foreground">{btcBalance} BTC</span>
                </div>
                <div className="flex gap-3">
                    <Send assets={assets} price={price} onSend={onSend} wallet={wallet} />
                    <Receive addresses={addresses} />
                </div>
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[150px] w-full"
                >
                    <AreaChart data={history}>
                        <CartesianGrid vertical={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="dot" labelKey="balance" />} />
                        <Area
                            dataKey="sats"
                            type="natural"
                            fill="var(--primary)"
                            fillOpacity="0.2"
                            stroke="var(--primary)"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}