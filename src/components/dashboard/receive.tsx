import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Addresses } from "@/hooks/use-wallet";
import { TabsReceive } from "./receive-tabs";
import { ArrowDown } from "lucide-react";
import { Card } from "../ui/card";

type Props = {
    addresses: Addresses
}

export const Receive: React.FC<Props> = ({ addresses }) => {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                </DialogHeader>
                <Card>
                <TabsReceive btcAddress={addresses.btc} sparkAddress={addresses.spark} lnAddress={addresses.ln} />
                </Card>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="bg-white">Cancel</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}