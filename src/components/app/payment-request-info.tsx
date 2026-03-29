import type { PaymentRequest } from "@/lib/nostr";
import { LucideText, Tag } from "lucide-react";
import { Slider } from "../ui/slider";
import { Spinner } from "../ui/spinner";

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

type Props = {
    paymentRequest: PaymentRequest,
    btcAmount: number,
    redeemDetails?: { redeemAmount: number, redeemTransaction: string }
    remainingRefreshTime?: number
}

export const PaymentRequestInfo: React.FC<Props> = ({ paymentRequest, btcAmount, redeemDetails, remainingRefreshTime }) => {
    return (
        <>
            <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-2">
                        <div className="font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground/60 uppercase flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Amount
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-3">
                                {redeemDetails != undefined && redeemDetails.redeemAmount && (
                                    <span className="text-4xl font-serif line-through text-muted-foreground/50">
                                        ${paymentRequest.amount}
                                    </span>
                                )}
                                <span className="text-5xl font-serif tracking-tight">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount - (redeemDetails?.redeemAmount || 0))}
                                </span>
                            </div>
                            {btcAmount > 0 && <span className="text-sm text-muted-foreground mt-1">
                                {Math.floor(btcAmount * 100_000_000)} sats • {btcAmount} BTC
                            </span>}
                            {btcAmount == 0 && <p className="text-xs text-muted-foreground flex items-center gap-2"><Spinner /> Fetch Bitcoin price</p>}
                        </div>
                        {remainingRefreshTime !== undefined && remainingRefreshTime > 0 &&
                            <div className="flex flex-col gap-2 mt-5">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground">Price refreshes in {formatTime(remainingRefreshTime)}</p>
                                </div>
                                <Slider max={60 * 5} min={0} value={[remainingRefreshTime > 0 ? 60 * 5 - remainingRefreshTime : 0]} className="" withThumb={false} />
                            </div>
                        }
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-mono text-xs font-medium tracking-[0.2em] uppercase flex items-center gap-2 text-muted-foreground/60">
                            <LucideText className="h-4 w-4" />
                            Description
                        </div>
                        <p className="text-sm">{paymentRequest.description || 'No description provided'}</p>
                    </div>
                </div>
            </div>
        </>
    )
}