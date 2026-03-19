import { shortenAddress } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QRCode from "react-qr-code"
import { Copy } from "lucide-react"
import { toast } from "sonner"

export type TabType = 'btc' | 'spark' | 'lightning'

type Props = {
    btcAddress: string
    sparkAddress: string
    lnAddress: string
    onTabChange?: (val: TabType, address: string) => void
    amount?: number
}

export const TabsReceive: React.FC<Props> = ({ btcAddress, sparkAddress, lnAddress, onTabChange, amount }) => {
    const copy = (address: string) => {
        navigator.clipboard.writeText(address)
        const toastId = toast.info('Address copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    const handleTabChange = (e: string) => {
        if (onTabChange) {
            switch (e) {
                case 'btc':
                    onTabChange('btc', btcAddress)
                    break
                case 'lightning':
                    onTabChange('lightning', lnAddress)
                    break
                case 'spark':
                    onTabChange('spark', sparkAddress)
                    break
                default:
                    throw new Error('Unsupported payment type')
            }
        }
    }

    return (
        <Card>
            <Tabs defaultValue="spark" onValueChange={handleTabChange} className="flex flex-col gap-10">
                <TabsList className="bg-transparent p-0 border-border/40 border-b-1 w-full rounded-none flex-col lg:flex-row flex h-full ">
                    <TabsTrigger value={"spark"} className="focus-visible:shadow-none focus-visible:outline-0 focus-visible:ring-[0px] focus-visible:border-0 w-full font-mono uppercase text-xs p-3 lg:p-5 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300 flex flex-col gap-2 data-[state=active]:border-b-primary data-[state=active]:border-b rounded-none">Spark</TabsTrigger>
                    <TabsTrigger value={"lightning"} className="focus-visible:shadow-none focus-visible:outline-0 focus-visible:ring-[0px] focus-visible:border-0 w-full font-mono uppercase text-xs p-3 lg:p-5 bg-primary/50  data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300 flex flex-col gap-2 data-[state=active]:border-b-primary data-[state=active]:border-b rounded-none">Lightning</TabsTrigger>
                    <TabsTrigger value={"btc"} className="focus-visible:shadow-none focus-visible:outline-0 focus-visible:ring-[0px] focus-visible:border-0  w-full font-mono uppercase text-xs p-3 lg:p-5 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent data-[state=active]:text-primary text-gray-300 flex flex-col gap-2 data-[state=active]:border-b-primary data-[state=active]:border-b rounded-none">Bitcoin</TabsTrigger>
                </TabsList>
                <TabsContent value="spark" className="flex flex-col gap-2">
                    <h2 className="font-semibold text-xl">Deposit via Spark</h2>
                    <p className="text-muted-foreground text-sm">Instant, near-zero-cost transfers between Spark users with complete privacy.</p>
                    <div className="flex flex-col gap-5 w-full">
                        <div className="bg-white lg:p-10 rounded w-full justify-center flex"><QRCode value={sparkAddress} size={150} /></div>
                        <div className="flex flex-col gap-2 bg-gray-50 p-3 border rounded-lg border-border/40">
                            <p className="text-primary text-xs font-mono uppercase">Deposit {amount && `${amount} BTC to this`} Spark address </p>
                            <p className="flex gap-2 text-sm text-muted-foreground">
                                {shortenAddress(sparkAddress)}
                                <Copy onClick={() => copy(sparkAddress)} className="w-4 h-4" />
                            </p>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="lightning" className="flex flex-col gap-2">
                    <h2 className="font-semibold text-xl">Deposit via Lightning</h2>
                    <p className="text-muted-foreground text-sm">Fast global payments, reaching any Lightning wallet worldwide.</p>
                    <div className="flex flex-col gap-5 w-full">
                        <div className="bg-white lg:p-10 rounded w-full justify-center flex"><QRCode value={lnAddress} size={150} /></div>
                        <div className="flex flex-col gap-2 bg-gray-50 p-3 border rounded-lg border-border/40">
                            <p className="text-primary text-xs font-mono uppercase">Deposit {amount && `${amount} BTC to this`} Lightning address </p>
                            <p className="flex gap-2 text-sm text-muted-foreground">
                                {shortenAddress(lnAddress)}
                                <Copy onClick={() => copy(lnAddress)} className="w-4 h-4" />
                            </p>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="btc" className="flex flex-col gap-2">
                    <h2 className="font-semibold text-xl">Deposit via Bitcoin</h2>
                    <p className="text-muted-foreground text-sm">Secure on-chain settlement with maximum security and global accessibility.</p>
                    <div className="flex flex-col gap-5 w-full">
                        <div className="bg-white lg:p-10 rounded w-full justify-center flex"><QRCode value={btcAddress} size={150} /></div>
                        <div className="flex flex-col gap-2 bg-gray-50 p-3 border rounded-lg border-border/40">
                            <p className="text-primary text-xs font-mono uppercase">Deposit {amount && `${amount} BTC to this`} Bitcoin address </p>
                            <p className="flex gap-2 text-sm text-muted-foreground">
                                {shortenAddress(btcAddress)}
                                <Copy onClick={() => copy(btcAddress)} className="w-4 h-4" />
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    )
}