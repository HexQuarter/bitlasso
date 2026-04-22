import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger, DialogFooter, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Addresses } from "@/hooks/use-wallet";
import { ArrowDown, Copy, QrCode } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { toast } from "sonner";
import { BiSolidZap } from "react-icons/bi";
import { FaBitcoin } from "react-icons/fa";
import QRCode from "react-qr-code";

type Props = {
    addresses: Addresses
}

export const Receive: React.FC<Props> = ({ addresses }) => {
    const [open, setOpen] = useState(false)
    const [displayedQrCode, setDisplayedQrCode] = useState('')

    const copy = (address: string) => {
        navigator.clipboard.writeText(address)
        const toastId = toast.info('Address copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    const handleOpen = (open: boolean) => {
        setDisplayedQrCode('')
        setOpen(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild onClick={() => setOpen(true)} >
                <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full ring-1 ring-border p-3 text-primary hover:ring-primary hover:cursor-pointer hover:bg-primary/10">
                        <ArrowDown className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">Receive</span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-slate-50 flex flex-col gap-10">
                <DialogHeader>
                    <DialogTitle className="font-serif text-3xl font-light">Receive funds</DialogTitle>
                    <DialogDescription>My addresses</DialogDescription>
                </DialogHeader>
                {/* <TabsReceive btcAddress={addresses.btc} sparkAddress={addresses.spark} lnAddress={addresses.ln} /> */}
                <div className="flex flex-col gap-2">
                    <div className="lex flex-col bg-white p-3 rounded-lg shadow-xs">
                        <div className="flex items-center gap-2 justify-between ">
                            <div className="flex gap-2 items-center">
                                <div className="bg-white text-primary p-2 rounded-full">
                                    <FaBitcoin className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="font-medium">Bitcoin address</p>
                                    <p className="text-sm text-muted-foreground">{shortenAddress(addresses.btc)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => copy(addresses.btc)}>
                                    <Copy className="h-4 w-4" />
                                </div>
                                {displayedQrCode != 'btc' && <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => setDisplayedQrCode('btc')}>
                                    <QrCode className="h-4 w-4" />
                                </div>}
                            </div>
                        </div>
                        {displayedQrCode == 'btc' && <div className="flex justify-center mt-10 mb-10">
                            <QRCode value={addresses.btc} size={150} />
                        </div>}
                    </div>
                    <div className="lex flex-col bg-white p-3 rounded-lg shadow-xs">
                        <div className="flex items-center gap-2 justify-between ">
                            <div className="flex gap-2 items-center">
                                <div className="bg-white text-yellow-400 p-2 rounded-full">
                                    <BiSolidZap className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="font-medium">Lightning address</p>
                                    <p className="text-sm text-muted-foreground">{shortenAddress(addresses.ln)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => copy(addresses.ln)}>
                                    <Copy className="h-4 w-4" />
                                </div>
                                {displayedQrCode != 'lightning' && <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => setDisplayedQrCode('lightning')}>
                                    <QrCode className="h-4 w-4" />
                                </div>}
                            </div>
                        </div>
                        {displayedQrCode == 'lightning' && <div className="flex justify-center mt-10 mb-10">
                            <QRCode value={addresses.ln} size={150} />
                        </div>}
                    </div>
                    <div className="flex flex-col bg-white p-3 rounded-lg shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-2 items-center">
                                <div className="bg-black p-2 rounded-full">
                                    <svg width="10" height="10" viewBox="0 0 68 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M39.7159 25.248L40.8727 0.570312H26.4219L27.5787 25.2483L4.46555 16.5221L0 30.2656L23.8282 36.7915L8.38717 56.0763L20.0781 64.5703L33.6483 43.9245L47.2179 64.5695L58.9089 56.0755L43.4679 36.7909L67.2937 30.2657L62.8281 16.5221L39.7159 25.248ZM33.6472 33.6013L33.647 33.6007H33.6466L33.6462 33.6021L33.6472 33.6013Z" fill="#fff" />
                                    </svg>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="font-medium">Spark address</p>
                                    <p className="text-sm text-muted-foreground">{shortenAddress(addresses.spark)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => copy(addresses.spark)}>
                                    <Copy className="h-4 w-4" />
                                </div>
                                {displayedQrCode != 'spark' && <div className="border border-gray-200 text-primary p-3 rounded-full hover:bg-primary/10 hover:border-primary/40 hover:cursor-pointer" onClick={() => setDisplayedQrCode('spark')}>
                                    <QrCode className="h-4 w-4" />
                                </div>}
                            </div>
                        </div>
                        {displayedQrCode == 'spark' && <div className="flex justify-center mt-10 mb-10">
                            <QRCode value={addresses.spark} size={150} />
                        </div>}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="bg-white">Cancel</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}