import type { Settings } from "@/lib/api"
import { shortenAddress, sparkBech32ToHex } from "@/lib/utils"
import { usePostHog } from "@posthog/react"
import { useEffect, useState } from "react"
import { AddressPurpose, request, RpcErrorCode } from "sats-connect"
import { subscribeRedeem, type PaymentRequest } from "@/lib/nostr"
import { ExternalLink, Gift } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

import XVerseWhiteLogo from '../../../public/xverse_white_logo.png'
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Slider } from "../ui/slider"
import QRCode from "react-qr-code"
import { Spinner } from "../ui/spinner"
import { IconBrowser } from "@tabler/icons-react"

type Props = {
    settings: Settings,
    paymentRequest: PaymentRequest,
    handleRedeem: (transaction: string, amount: number) => void,
    maxRedeemableToken: number,
    availableWallet: boolean,
}

export const LoyaltySection: React.FC<Props> = ({ settings, paymentRequest, handleRedeem, maxRedeemableToken, availableWallet }) => {
    const [tokenBalance, setTokenBalance] = useState<undefined | { amount: number, name: string, decimals: number }>(undefined)
    const [redeemedTokens, setRedeemedTokens] = useState(0)
    const [loadingTokens, setLoadingTokens] = useState(false)
    const [redeemLoading, setRedeemLoading] = useState(false)
    const [redeeemError, setRedeemError] = useState<undefined | string>(undefined)
    const [wallet, setWallet] = useState<string | undefined>(undefined)

    const posthog = usePostHog()

    const connectWallet = async () => {
        if (!paymentRequest) return

        const data = await request('getAccounts', { purposes: [AddressPurpose.Spark, AddressPurpose.Payment] });
        if (data.status !== 'success') {
            return;
        }
        const address = data.result.at(0)?.address;
        if (!address) {
            return;
        }

        setWallet(address);
        void(() => posthog?.capture('wallet_connected_for_discount', { payment_id: paymentRequest.id }))()

        setLoadingTokens(true)

        const sparkBalance = await request('spark_getBalance', null)
        if (sparkBalance.status == 'error') {
            setLoadingTokens(false)
            return
        }

        const tokenIdentifierHex = sparkBech32ToHex(paymentRequest.tokenId)
        const tokenBalance = sparkBalance.result.tokenBalances.find(tb => tb.tokenMetadata.tokenIdentifier == tokenIdentifierHex)
        if (!tokenBalance) {
            setLoadingTokens(false)
            return
        }

        setTokenBalance({
            name: tokenBalance.tokenMetadata.tokenName,
            amount: parseInt(tokenBalance.balance) / (10 ** tokenBalance.tokenMetadata.decimals),
            decimals: tokenBalance.tokenMetadata.decimals
        })

        setLoadingTokens(false)
    }

    const handleRedeemTokens = async () => {
        if (!paymentRequest || !tokenBalance) return
        setRedeemLoading(true)
        setRedeemError(undefined)

        const response = await request("spark_transferToken", {
            receiverSparkAddress: paymentRequest.sparkAddress,
            tokenIdentifier: paymentRequest.tokenId,
            tokenAmount: redeemedTokens
        });
        if (response.status == 'error') {
            setRedeemLoading(false)
            if (response.error.code === RpcErrorCode.USER_REJECTION) {
                return
            }
            setRedeemError(response.error.message)
            return
        }
        void(() => posthog?.capture('tokens_redeemed', {
            payment_id: paymentRequest.id,
            tokens_redeemed: redeemedTokens,
        }))()
    }

    useEffect(() => {
        if (!paymentRequest.redeemAmount) {
            subscribeRedeem(settings, paymentRequest.id, (redeemAmount: number, redeemTransaction: string) => {
                handleRedeem(redeemTransaction, redeemAmount)
                toast.success('Token have been redeemed. You can proceed to the payment with the discount applied')
                setRedeemLoading(false)
            })
        }
    }, [])

    return (
        <div className="">
            <div className="mt-1">
                <div className="text-slate-800 text-medium pb-2 flex items-center gap-2 text-sm">Redeem loyalty tokens to get discount.</div>
            </div>
            <Tabs defaultValue="browser" className="mt-5">
                <TabsList className="p-0 border-0 flex-col lg:flex-row flex h-full bg-transparent gap-3">
                    <TabsTrigger value="browser" className="bg-white border bg-black/5 text-sm data-[state=active]:text-primary px-4 py-2 w-full data-[state=active]:bg-primary/10 data-[state=active]:border-primary/20 rounded-full h-10 text-xs"><IconBrowser />Use browser wallet</TabsTrigger>
                    <TabsTrigger value="external" className="bg-white border bg-black/5 text-sm data-[state=active]:text-primary px-4 py-2 w-full data-[state=active]:bg-primary/10 data-[state=active]:border-primary/20 rounded-full h-10 text-xs"><ExternalLink />Use external wallet</TabsTrigger>
                </TabsList>
                <TabsContent value="browser" className="bg-gray-50 p-5 rounded-sm">
                    {!wallet &&
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground ">Connect your wallet to check your token balance and apply a discount to this payment.</p>
                            {availableWallet && <div className="flex mt-5"><Button onClick={connectWallet} className="text-xs"><img src={XVerseWhiteLogo} className="h-3 w-3" /> Connect XVerse wallet</Button></div>}
                            {!availableWallet && <p className="text-muted-foreground text-xs border-t pt-2 mt-2">Don't have Xverse? <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">Download it free</a></p>}
                        </div>
                    }
                    {wallet &&
                        <div className="flex flex-col gap-5">
                            {loadingTokens && <span className="text-xs flex items-center gap-2 text-primary"><Spinner /> fetching token balance...</span>}
                            {!loadingTokens &&
                                <div className="flex flex-col gap-5">
                                    <div className="flex justify-between items-center border border-primary/10 bg-primary/10 rounded-sm gap-2 p-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 bg-green-400 rounded"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Connected wallet: </span>
                                                <span className="text-xs text-muted-foreground font-mono tracking-tight">{shortenAddress(wallet, 5)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!tokenBalance && <p className="text-sm font-semibold">You dont'have tokens to redeem for that payment.</p>}
                                    {tokenBalance &&
                                        <>
                                            <div className="rounded-lg flex flex-col">
                                                <span className="text-sm text-muted-foreground">Your token balance</span>
                                                <span className="text-xl">{tokenBalance?.amount} {tokenBalance?.name}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between text-xs">
                                                    <span>Tokens to redeem</span>
                                                    <span>{redeemedTokens} {tokenBalance?.name}</span>
                                                </div>
                                                <Slider step={1} max={maxRedeemableToken} onValueChange={(val) => setRedeemedTokens(val[0])} />
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>0 (no discount)</span>
                                                    <span>{maxRedeemableToken} (max 10%)</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between gap-5">
                                                <div className="flex flex-col rounded-lg border border-border flex-1 p-3 gap-1">
                                                    <span className="text-xs">You pay</span>
                                                    <span className="text-lg font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentRequest.amount - redeemedTokens)}</span>
                                                </div>
                                                <div className="flex flex-col bg-green-400/10 rounded-lg border border-green-400/20 flex-1 p-3 gap-1">
                                                    <span className="text-xs">You save</span>
                                                    <span className="text-lg text-green-600 font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(redeemedTokens)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-center mt-5"><Button onClick={handleRedeemTokens} disabled={redeemedTokens == 0 || redeemLoading}>{redeemLoading ? <Spinner /> : <span className="flex items-center gap-2"><Gift />Apply discount</span>}</Button></div>
                                            {redeeemError && <p className="text-primary text-sm">Error: {redeeemError}</p>}
                                        </>
                                    }

                                </div>
                            }
                        </div>
                    }
                </TabsContent>
                <TabsContent value="external" className="flex flex-col gap-5 bg-gray-50 p-5 rounded-sm">
                    <p className="text-sm text-muted-foreground">Scan this QR code with any Spark-compatible wallet to apply your loyalty discount before paying.</p>
                    <div className="flex justify-center">
                        <QRCode value={paymentRequest.sparkAddress} size={150} />
                    </div>
                    <div className="flex flex-col gap-4 text-xs">
                        <div className="flex gap-2 items-center">
                            <span className="bg-primary/5 border border-primary/20 text-primary rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">1</span>
                            <span>Open any Spark-compatible wallet (i.e. <a href="https://xverse.app" target="_blank" className="text-primary hover:underline">XVerse</a>, <a href="https://blitzwalletapp.com/" target="_blank" className="text-primary hover:underline">Blitz</a>) and tap Scan.</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="bg-primary/5 border border-primary/20 text-primary rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">2</span>
                            <span>Scan this QR code and send {maxRedeemableToken > 1 ? `up to ${maxRedeemableToken} tokens` : '1 token'}.</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="bg-primary/5 border border-primary/20 text-primary rounded-full p-4 h-5 w-5 text-center items-center flex justify-center">3</span>
                            <span>Confirm the redemption. This page will update automatically with your discount applied.</span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
