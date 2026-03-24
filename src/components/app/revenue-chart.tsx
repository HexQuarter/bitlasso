"use client"
import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { useMemo, useState } from "react"
import { Button } from "../ui/button"
export const description = "An interactive area chart"

type ChartData = {
    date: Date,
    amount: number
}

const chartConfig = {
    amount: {
        label: "Amount"
    },
} satisfies ChartConfig

export const RevenueChart: React.FC<{ chartData: ChartData[] }> = ({ chartData }) => {
    // controls for range selection
    const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily")

    const filteredData = useMemo(() => {
        const now = new Date()
        const startDate = new Date(now)
        switch (range) {
            case "daily":
                // start from beginning of current day (midnight)
                startDate.setHours(0, 0, 0, 0)
                break
            case "weekly":
                startDate.setDate(now.getDate() - 7)
                break
            case "monthly":
                startDate.setMonth(now.getMonth() - 1)
                break
            case "yearly":
                startDate.setFullYear(now.getFullYear() - 1)
                break
        }

        const map = new Map<string, number>()
        chartData.forEach((item) => {
            if (item.date < startDate) {
                return
            }
            let key: string
            if (range === "yearly") {
                key = `${item.date.getFullYear()}-${(item.date.getMonth() + 1).toString().padStart(2, "0")}`
            } else if (range === "daily") {
                key = item.date.toISOString()
            } else {
                key = item.date.toISOString().slice(0, 10)
            }

            map.set(key, (map.get(key) || 0) + item.amount)
        })

        return Array.from(map.entries())
            .sort((a, b) => (a[0] > b[0] ? 1 : -1))
            .map(([date, amount]) => ({ date, amount }))
    }, [chartData, range])

    const tickFormatter = (value: string) => {
        if (!value) return ""
        let date = new Date(value)
        if (range === "yearly") {
            return date.toLocaleDateString("en-US", { month: "short" })
        }
        if (range === "daily") {
            return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })
        }
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
    }

    const labelFormatter = (value: string) => {
        if (!value) return ""
        let date = new Date(value)
        if (range === "yearly") {
            return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        }
        if (range === "daily") {
            return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })
        }
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
    }

    return (
        <div>

            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[150px] w-full"
            >
                <AreaChart data={filteredData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={5}
                        interval={0}
                        padding={{ left: 20, right: 20 }}
                        tickFormatter={tickFormatter}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                labelFormatter={labelFormatter}
                                indicator="dot"
                            />
                        }

                    />
                    <Area
                        dataKey="amount"
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
            <div className="flex gap-2 mt-5 justify-center">
                <Button variant='outline' disabled={range == 'daily'} className={`h-5 text-xs px-4 py-4 ${range == 'daily' ? 'disabled:opacity-100 text-white bg-primary border-primary border-1' : ''}`} onClick={() => setRange("daily")}>Daily</Button>
                <Button variant='outline' disabled={range == 'weekly'} className={`h-5 text-xs px-4 py-4 ${range == 'weekly' ? 'disabled:opacity-100 text-white bg-primary border-primary border-1' : ''}`} onClick={() => setRange("weekly")}>Weekly</Button>
                <Button variant='outline' disabled={range == 'monthly'} className={`h-5 text-xs px-4 py-4 ${range == 'monthly' ? 'disabled:opacity-100 text-white bg-primary border-primary border-1' : ''}`} onClick={() => setRange("monthly")}>Monthly</Button>
                <Button variant='outline' disabled={range =='yearly'} className={`h-5 text-xs px-4 py-4 ${range == 'yearly' ? 'disabled:opacity-100 text-white bg-primary border-primary border-1' : ''}`} onClick={() => setRange("yearly")}>Yearly</Button>
            </div>
        </div>
    )
}
