import { NewTokenForm } from "@/components/app/new-token-form"

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@/hooks/use-wallet"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { WalletCard } from "@/components/app/wallet-card"
import { IssueReceiptForm, type IssueReceiptData } from "@/components/app/issue-receipt"
import { PaymentRequestForm, type PaymentRequestData } from "@/components/app/payment-request"
import { ReceiptTable, type Receipt } from "@/components/app/receipt-table"
import { type SparkPayment, type TokenBalanceMap, type TokenMetadata, type TokenStats, type Wallet } from "@/lib/wallet"
import { PaymentTable, type Payment } from "@/components/app/payment-table"
import { BTCAsset, type Asset } from "@/components/app/send"
import { addTokenBalance, send, subTokenBalance } from "@/lib/utils"
import type { ReceiptMetadataData } from "@/components/app/receipt-metadata-form"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangleIcon, Coins, ExternalLink, FileText, MoreHorizontal, Pickaxe, Plus, RefreshCcw, Rocket, Wallet2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RevenueChart } from "@/components/app/revenue-chart"
import { fetchPaymentsRequest, getNotifSettings, listReceipts, publishReceiptMetadata, subscribePayment, subscribeRedeem } from "@/lib/nostr"
import { Spinner } from "@/components/ui/spinner"
import { publishPaymentRequest, type Settings } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useNavigate } from "react-router"
import { IconMessageDollar } from "@tabler/icons-react"
import { usePostHog } from "@posthog/react";
import { useSettings } from "@/hooks/use-settings"

export const DashboardPage = () => {
    const { wallet } = useWallet()
    const { settings } = useSettings()
    const navigate = useNavigate()
    const posthog = usePostHog()

    const hasSecuredMnemonic = localStorage.getItem('BITLASSO_SECURED_MNEMONIC') || 'false'

    const [tokenMetadataLoading, setTokenMetadataLoading] = useState(true)
    const [satsBalance, setSatsBalance] = useState(0n)
    const [tokenBalances, setTokenBalances] = useState<TokenBalanceMap | undefined>(undefined)
    const [issuanceStats, setIssuanceStats] = useState<TokenStats | undefined>(undefined)
    const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | undefined>(undefined)
    const [addresses, setAddresses] = useState<{ btc: string, ln: string, spark: string } | null>(null)
    const [price, setPrice] = useState(0)
    const [paymentRequests, setPaymentRequests] = useState<Payment[]>([])
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [walletHistory, setWalletHistory] = useState<SparkPayment[]>([])
    const [notifSettingAlert, setNotifSettingAlert] = useState(false)
    const [walletLoading, setWalletLoading] = useState(true)
    const [paymentRequestLoading, setPaymentRequestLoading] = useState(true)
    const [receiptLoading, setReceiptLoading] = useState(true)
    const [walletHistoryLoading, setWalletHistoryLoading] = useState(true)

    const currency = localStorage.getItem('BITLASSO_CURRENCY') || 'USD'

    const updateBalance = async (wallet: Wallet) => {
        const balance = await wallet.getBalance()
        setSatsBalance(balance.balance)

        if (balance.tokenBalances.size > 0) {
            setTokenBalances(balance.tokenBalances)
        }
    }

    const refreshIssuanceStats = async (wallet: Wallet, metadata: TokenMetadata) => {
        const stats = await wallet.getTokenStats(metadata)
        if (stats) {
            setIssuanceStats(stats)
        }
    }

    const attemptClaim = async (wallet: Wallet, nonce: number, attempt = 0) => {
        const sweptKey = `BITLASSO_SWEPT_${nonce}`
        try {
            console.log("Attempt claim", nonce)
            await claimBalance(wallet, nonce)
            localStorage.setItem(sweptKey, 'true')
        } catch (err: any) {
            setTimeout(() => attemptClaim(wallet, nonce, attempt + 1), 2000)
        }
    }

    const claimBalance = async (wallet: Wallet, nonce: number) => {
        // Check local cache first
        const sweptKey = `BITLASSO_SWEPT_${nonce}`
        if (localStorage.getItem(sweptKey) === 'true') return

        const requestSdk = await wallet.withAccountNumber(nonce)

        const unclaimedBitcoinDeposits = await requestSdk.listUnclaimDeposits()

        await Promise.all(unclaimedBitcoinDeposits.map(d => requestSdk.claimDeposit(d.txid, d.vout)))

        const balance = await requestSdk.getBalance(true)
        const satsBalance = Number(balance.balance)

        if (satsBalance > 0) {
            const sparkAddress = await wallet.getSparkAddress()
            console.log('claiming from sub account', nonce, satsBalance)
            await requestSdk.sendSparkPayment(sparkAddress, satsBalance)
            localStorage.setItem(sweptKey, 'true')
        }
        await requestSdk.disconnect()
    }

    const fetchData = async (wallet: Wallet) => {
        try {
            const metadata = await wallet.getTokenMetadata().catch(() => null)
            if (metadata) {
                setTokenMetadata(metadata)
                setTimeout(async () => await refreshIssuanceStats(wallet, metadata))
            }
            setTokenMetadataLoading(false)
        }
        catch (_e) {
            setTokenMetadataLoading(false)
        }

        setTimeout(async () => {
            const [btc, spark, ln] = await Promise.all([
                wallet.getBitcoinAddress(),
                wallet.getSparkAddress(),
                wallet.getLightningAddress(),
            ])
            setAddresses({ btc, spark, ln })
            setWalletLoading(false)
        })

        setTimeout(async () => {
            await refreshPaymentRequests()
            setPaymentRequestLoading(false)
            await refreshReceipts()
            setReceiptLoading(false)
        })

        setTimeout(async () => {
            await updateBalance(wallet)
            setTimeout(async () => {
                const payments = await wallet.listPayments()
                setWalletHistory(payments)
                setWalletHistoryLoading(false)
            })
        })

        setTimeout(async () => {
            const prices = await wallet.fetchPrices()
            const p = prices.find(p => p.currency.toUpperCase() == currency.toUpperCase())
            if (p) {
                setPrice(p.value)
            }
        }, 0)

        setInterval(async () => {
            const prices = await wallet.fetchPrices()
            const p = prices.find(p => p.currency.toUpperCase() == currency.toUpperCase())
            if (p) {
                setPrice(p.value)
            }
        }, 60_000)
    }

    let startupOnce = useRef(false)

    useEffect(() => {
        if (!wallet) return
        if (startupOnce.current) return

        setTimeout(async () => {
            const notifSettings = await getNotifSettings(wallet)
            if (!notifSettings || (notifSettings.email == undefined && notifSettings.npub == undefined)) {
                setNotifSettingAlert(true)
            }
        })

        fetchData(wallet)

        const refreshBalance = async () => {
            await updateBalance(wallet)

            const payments = await wallet.listPayments()
            setWalletHistory(payments)

            if (tokenMetadata) {
                refreshIssuanceStats(wallet, tokenMetadata)
            }
        }

        wallet.on('synced', refreshBalance)
        wallet.on('paymentPending', (payment) => {
            if (payment.paymentType == 'receive') {
                toast.info(`Payment incoming. Waiting for confirmation...`)
            }
        })
        wallet.on('paymentReceived', async (payment) => {
            if (payment.method != 'token') {
                toast.success(`Received payment of ${Number(payment.amount)} sats`)
            }
            await refreshBalance()
        })
        wallet.on('paymentSent', async () => {
            await refreshBalance()
        })

        startupOnce.current = true
        //   
    }, [wallet])


    const refreshPaymentRequests = async () => {
        if (!wallet || !settings) return []
        const paymentRequests = await fetchPaymentsRequest(settings, wallet)
        if (paymentRequests.length > 0) {
            const maxNonce = Math.max(...paymentRequests.map(p => p.nonce))
            localStorage.setItem("BITLASSO_PAYMENT_NONCE", maxNonce.toString())
        }
        setPaymentRequests(paymentRequests)

        paymentRequests.forEach(payment => {
            subscribePayment(settings as Settings, payment.id, async (settleTx, settlementMode) => {
                setPaymentRequests(prev =>
                    prev.map(p =>
                        p.id === payment.id
                            ? { ...p, settleTx, settlementMode }
                            : p
                    )
                );

                // Claim immediately on settlement event
                const sweptKey = `BITLASSO_SWEPT_${payment.nonce}`
                if (localStorage.getItem(sweptKey) !== 'true') {
                    await attemptClaim(wallet, payment.nonce)
                }
            })

            subscribeRedeem(settings as Settings, payment.id, (redeemAmount, redeemTx) => {
                setPaymentRequests(prev =>
                    prev.map(p =>
                        p.id === payment.id
                            ? { ...p, redeemAmount, redeemTx }
                            : p
                    )
                );
            })
        })
    }

    const refreshReceipts = async () => {
        if (!wallet) return

        const receipts = await listReceipts(wallet)
        setReceipts(receipts)
    }

    const handleNewToken = async ({ name, symbol }: { name: string, symbol: string }) => {
        console.log('Creating token', name, symbol)
        if (!wallet) {
            return
        }

        try {
            const { tokenId } = await wallet.createToken(name, symbol, 0n, 1, false)
            console.log('Token created with ID:', tokenId)
            setTimeout(() => posthog?.capture('loyalty_token_created', { token_name: name, token_symbol: symbol }))

            const metadata = await wallet.getTokenMetadata()
            setTokenMetadata(metadata)
            setIssuanceStats({ mints: 0, burns: 0, circulating: 0, transfers: 0 })
        }
        catch (e) {
            const error = e as Error
            console.error(error.message)
            toast.error(error.message)
        }
    }

    const handleIssueReceipt = async (data: IssueReceiptData) => {
        if (!wallet || !tokenMetadata || !settings) return

        const response = await wallet?.mintTokens(BigInt(data.mintableTokens) * BigInt(10 ** tokenMetadata.decimals))
        if (!response) return
        console.log('Issued receipt with tx ID:', response?.id)

        await publishReceiptMetadata(wallet,
            response?.id,
            data.mintableTokens,
            response.timestamp,
            data.description,
            data.recipientAddress,
            data.paymentId
        )

        if (data.recipientAddress && data.recipientAddress != '') {
            const asset = { name: tokenMetadata.name, symbol: tokenMetadata.symbol, identifier: tokenMetadata.identifier } as Asset
            const id = await send(settings, wallet, asset, data.mintableTokens, data.recipientAddress, 'spark')
            console.log('Token transfered to recipient:', id)
        }

        setReceipts((prevReceipts) => [
            {
                date: response.timestamp,
                amount: data.mintableTokens,
                description: data.description,
                recipient: data.recipientAddress,
                paymentId: data.paymentId,
                transaction: response.id
            },
            ...prevReceipts
        ])

        setTimeout(() => posthog?.capture('receipt_issued', {
            amount: data.mintableTokens,
            has_recipient: !!(data.recipientAddress && data.recipientAddress !== ''),
            token_symbol: tokenMetadata?.symbol,
        }))
        await refreshIssuanceStats(wallet, tokenMetadata as TokenMetadata)
        setTokenBalances((prev) => addTokenBalance(prev, tokenMetadata, data.mintableTokens))
    }

    const handlePaymentRequest = async (data: PaymentRequestData) => {
        if (!wallet || !tokenMetadata || !settings) {
            console.log(wallet, tokenMetadata, tokenBalances, settings)
            return
        }

        let txId: string
        if (data.feeSats) {
            txId = await send(settings, wallet, BTCAsset, data.feeSats, settings.address, "spark")
        }
        else {
            if (!tokenBalances) {
                toast.error('No credits available to activate payment request')
                return
            }
            const burnToken = tokenBalances.get(settings.tokenAddress)
            if (!burnToken) {
                toast.error('No credits available to activate payment request')
                return
            }

            const creditsToBurn = 1
            const decimalsFactor = BigInt(10) ** BigInt(burnToken.tokenMetadata.decimals)
            const burnAmount = BigInt(creditsToBurn) * decimalsFactor

            const { id } = await wallet.burnTokens(burnAmount, burnToken.tokenMetadata.identifier)
            txId = id

            setTokenBalances((prev) => subTokenBalance(prev, burnToken.tokenMetadata, 1))
        }

        const currentMax = Math.max(
            Number(localStorage.getItem('BITLASSO_PAYMENT_NONCE') || '1'),
            ...paymentRequests.map(p => p.nonce) // use in-memory state as source of truth
        )
        const nonce = currentMax + 1

        localStorage.setItem('BITLASSO_PAYMENT_NONCE', nonce.toString())

        await publishPaymentRequest(txId, wallet, nonce, data.amount, tokenMetadata.identifier, data.discountRate, data.description)
        await refreshPaymentRequests()
        setTimeout(() => posthog?.capture('payment_request_created', {
            amount_usd: data.amount,
            discount_rate: data.discountRate,
            paid_with_credits: !data.feeSats,
        }))
        toast.success('Payment request created successfully')
    }

    const handleSend = async (method: 'spark' | 'lightning' | 'bitcoin', asset: Asset, amount: number, recipient: string) => {
        if (!wallet || !settings) return
        await send(settings, wallet, asset, amount, recipient, method)
    }

    const handleReceiptMetadataChange = async (data: ReceiptMetadataData) => {
        if (!wallet) return

        const { amount, recipient } = receipts.find(r => r.transaction == data.transactionId) as Receipt
        await publishReceiptMetadata(wallet,
            data.transactionId,
            amount,
            new Date(),
            data.description,
            recipient,
            data.paymentId
        )

        await new Promise<void>((r) => {
            setTimeout(async () => {
                await refreshReceipts()
                r()
            }, 1000)
        })
    }

    const handlePurchaseCredits = async (amount: number) => {
        if (!settings) return

        const tokenMetadata = await wallet?.getTokenMetadata(settings.tokenAddress) as TokenMetadata
        setTokenBalances((prev) => addTokenBalance(prev, tokenMetadata, amount))
    }

    const tokensData: { id: string, name: string, symbol: string, amount: number }[] = useMemo(() => {
        const tokensData: any[] = []
        if (tokenBalances) {
            for (let [_, val] of tokenBalances) {
                tokensData.push({
                    id: val.tokenMetadata.identifier,
                    name: val.tokenMetadata.name,
                    symbol: val.tokenMetadata.symbol,
                    amount: Number(val.balance) / (10 ** val.tokenMetadata.decimals)
                })
            }
        }
        return tokensData

    }, [tokenBalances])

    const revenuePayments = useMemo(() => {
        return paymentRequests
            .filter(p => p.settleTx !== undefined)
            .map((p) => ({ date: p.createdAt, amount: p.amount }))
    }, [paymentRequests])

    const revenue = useMemo(() => {
        return paymentRequests.filter(p => p.settleTx !== undefined).reduce((acc, p) => p.amount + acc, 0)
    }, [paymentRequests])

    const pendingPayments = useMemo(() => {
        return paymentRequests.filter(p => p.settleTx === undefined).length
    }, [paymentRequests])

    const creditBalance = useMemo(() => {
        if (!settings) return 0
        const token = tokensData.find(t => t.id == settings?.tokenAddress)
        if (!token) return 0
        return token.amount
    }, [tokensData])

    return (
        <div className="flex flex-col w-full gap-10">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 justify-between">
                    <h1 className="text-4xl font-serif font-normal text-foreground flex md:items-center justify-between md:flex-row flex-col">Dashboard {tokenMetadataLoading && <p className="text-xs flex items-center font-mono uppercase text-primary"><span>Syncing wallet data...</span> <Spinner className="ml-2 text-primary" /></p>}</h1>
                    <h2 className="text-1xl font-light text-muted-foreground">Turn paid work into Bitcoin-anchored receipts that reward repeat clients.</h2>
                </div>
                {hasSecuredMnemonic == 'false' && <Alert className="py-5">
                    <AlertTriangleIcon />
                    <AlertTitle>Secure your wallet before going live</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                        <p>
                            <span className="italic text-primary">Your secret phrase has not been saved yet. </span>
                            <span>If you lose access to this device, your funds cannot be recovered by anyone — including us.</span>
                        </p>
                        <div><Button variant='outline' className="h-4 text-xs p-4 mt-0" onClick={() => navigate('/app/settings')}>Export your secret phrase</Button></div>
                    </AlertDescription>
                </Alert>}
                {notifSettingAlert && <Alert className="py-5">
                    <IconMessageDollar />
                    <AlertTitle>Be notified when you're paid</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                        <div className="flex flex-col">
                            <p>You can active notifications to get updates when your payment is processed.</p>
                        </div>
                        <div><Button variant='outline' className="h-4 text-xs p-4 mt-0" onClick={() => navigate('/app/settings')}>Enable notifications</Button></div>
                    </AlertDescription>
                </Alert>}
            </div>

            {(!tokenMetadataLoading && tokenMetadata) && <div className="grid lg:grid-cols-3 gap-2">
                <Card className="col-span-1">
                    <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 p-3 rounded-full items-center"><Zap className="h-4 w-4 text-primary" /></span>
                            Total revenue
                        </div>
                    </CardHeader>
                    {paymentRequestLoading && <CardContent className="flex flex-col gap-5">
                        <Skeleton className="h-10 w-1/4" />
                        <Skeleton className="h-50 w-full" />
                    </CardContent>}
                    {!paymentRequestLoading && <CardContent className="flex flex-col gap-10">
                        <span className="text-2xl font-semibold">{Intl.NumberFormat(navigator.language || "en-US", { style: 'currency', currency: 'USD' }).format(revenue)}</span>
                        <RevenueChart chartData={revenuePayments} />
                    </CardContent>}
                </Card>
                <div className="flex flex-col gap-2 col-span-1">
                    <Card className="flex-1">
                        <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 p-3 rounded-full items-center"><FileText className="h-4 w-4 text-primary" /></span>
                                Activated payments
                            </div>
                        </CardHeader>
                        {paymentRequestLoading && <CardContent className="flex flex-col gap-2">
                            <Skeleton className="h-10 w-1/6" />
                            <Skeleton className="h-10 w-1/4" />
                        </CardContent>}
                        {!paymentRequestLoading && <CardContent className="flex flex-col gap-2">
                            <span className="text-2xl font-semibold">{paymentRequests.length}</span>
                            <span className="text-xs text-muted-foreground">{pendingPayments} pendings</span>
                        </CardContent>}
                    </Card>
                    <Card className="flex-1">
                        <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-3 rounded-full items-center"><Coins className="h-4 w-4 text-primary" /></div>
                                Minted credits
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex gap-1 items-center">
                                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {tokenMetadata && <DropdownMenuItem onClick={() => window.open(`https://sparkscan.io/token/${tokenMetadata.identifier}`, '_blank')}>View details on explorer<ExternalLink /></DropdownMenuItem>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        {!issuanceStats && <CardContent className="flex flex-col gap-2">
                            <Skeleton className="h-10 w-1/4" />
                            <Skeleton className="h-10 w-1/4" />
                        </CardContent>}
                        {issuanceStats &&
                            <CardContent className="flex flex-col gap-2">
                                <span className="text-2xl font-semibold">{issuanceStats.mints} {tokenMetadata.symbol}</span>
                                <span className="text-muted-foreground text-xs">{issuanceStats.burns} redeemed</span>
                            </CardContent>
                        }
                    </Card>
                </div>
                <div className="flex flex-col gap-2 col-span-1">
                    <div className="flex-1">
                        {walletLoading && <Card className="lg:col-span-1 h-full">
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
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-9 w-1/5" />
                                    <Skeleton className="h-5 w-1/4" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-10 w-10" />
                                    <Skeleton className="h-10 w-10" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-50 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                        }
                        {!walletLoading && wallet && addresses &&
                            <WalletCard
                                addresses={addresses}
                                satsBalance={Number(satsBalance)}
                                tokens={tokensData}
                                price={price}
                                currency={currency}
                                onSend={handleSend}
                                payments={walletHistory}
                                wallet={wallet}
                                walletHistoryLoading={walletHistoryLoading} />}

                    </div>
                </div>
            </div>}
            <div className="grid lg:grid-cols-2 gap-2">
                {!tokenMetadataLoading && !tokenMetadata &&
                    <Card className="flex flex-col justify-between lg:col-span-1">
                        <CardHeader>
                            <h2 className="border-primary/40 flex gap-2 font-serif font-light text-2xl">Set up your loyalty token</h2>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col text-sm gap-2 justify-between">
                                <div className="bg-white border-1 border-border/40 p-4 rounded-lg group flex gap-2 items-center">
                                    <div className="text-primary flex p-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                                        <Rocket className="h-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold tracking-tight text-card-foreground">Deploy a token</p>
                                        <p className="text-muted-foreground text-xs">Issue receipts for completed work and enable client discounts.</p>
                                    </div>
                                </div>
                                <div className="bg-white border-1 border-border/40 p-4 rounded-lg flex gap-2 items-center">
                                    <div className="text-primary flex p-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                                        <Pickaxe className="h-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold tracking-tight text-card-foreground">Minting</p>
                                        <p className="text-xs text-muted-foreground ">Each time you deliver a project, you can mint tokens as proof of completed work.</p>
                                    </div>
                                </div>
                                <div className="bg-white border-1 border-border/40 p-4 rounded-lg flex gap-2 items-center">
                                    <div className="text-primary flex p-2 h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/12 group-hover:ring-primary/20">
                                        <RefreshCcw className="h-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold tracking-tight text-card-foreground">Loyalty</p>
                                        <p className="text-xs text-muted-foreground ">Those tokens can be redeemed for future discounts — encouraging repeated <span className="text-primary font-bold">loop of work</span>.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <NewTokenForm onSubmit={handleNewToken} />
                        </CardFooter>
                    </Card>
                }
                {!tokenMetadataLoading && <Card className="lg:col-span-1" id="payments">
                    <CardHeader className="flex flex-col">
                        <CardTitle className="flex lg:flex-row flex-col justify-between w-full gap-5">
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:w-full gap-2">
                                <p className="border-primary/40 flex gap-2 font-serif font-light text-2xl">Payment requests</p>
                                {paymentRequestLoading && <Skeleton className="h-10 w-40" />}
                                {!paymentRequestLoading && settings && <CardAction className='w-full lg:w-auto'>
                                    {satsBalance > 0n && <PaymentRequestForm settings={settings} onSubmit={handlePaymentRequest} price={price} creditBalance={creditBalance} onPurchaseCredits={handlePurchaseCredits} />}
                                    {satsBalance == 0n && <Button className="flex gap-2 has-[>svg]:pr-5 bg-primary hover:bg-black w-full lg:w-auto" disabled><Plus className="h-4 w-4" />New payment request</Button>}
                                </CardAction>}
                            </div>
                        </CardTitle>
                        <CardDescription>Request Bitcoin payments from your clients.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paymentRequestLoading &&
                            <div className="flex w-full flex-col gap-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div className="flex gap-4" key={index}>
                                        <Skeleton className="h-10 w-2/8" />
                                        <Skeleton className="h-10 w-1/8" />
                                        <Skeleton className="h-10 w-2/8" />
                                        <Skeleton className="h-10 w-2/8" />
                                        <Skeleton className="h-10 w-1/8" />
                                    </div>
                                ))}
                            </div>
                        }
                        {!paymentRequestLoading &&
                            <div className="md:max-w-full max-w-xs">
                                <PaymentTable
                                    data={paymentRequests.map(r => ({
                                        createdAt: r.createdAt,
                                        amount: r.amount,
                                        description: r.description,
                                        settleTx: r.settleTx,
                                        discountRate: r.discountRate,
                                        id: r.id,
                                        redeemAmount: r.redeemAmount,
                                        redeemTx: r.redeemTx,
                                        nonce: r.nonce,
                                        settlementMode: r.settlementMode
                                    }))}
                                    onDeriveReceipt={handleIssueReceipt}
                                    paymentRequests={paymentRequests}
                                    receipts={receipts} />
                            </div>
                        }
                    </CardContent>
                </Card>}
                {(!tokenMetadataLoading && tokenMetadata) && <Card className="lg:col-span-1" id="receipts">
                    <CardHeader className="flex flex-col">
                        <CardTitle className="flex 2xl:flex-row flex-col justify-between w-full gap-10">
                            <div className="flex flex-col lg:flex-row justify-between lg:w-full gap-5">
                                <p className="text-2xl font-serif text-2xl font-light ">Receipts</p>
                                <CardAction className="w-full lg:w-auto">
                                    {receiptLoading && <Skeleton className="h-10 w-30" />}
                                    {!receiptLoading && <IssueReceiptForm onSubmit={handleIssueReceipt} paymentRequests={paymentRequests} />}
                                </CardAction>
                            </div>
                        </CardTitle>
                        <CardDescription>Receipts issued for completed and paid work</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {receiptLoading &&
                            <div className="flex flex-col gap-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div className="flex gap-4" key={index}>
                                        <Skeleton className="h-10 flex-1" />
                                        <Skeleton className="h-10 flex-1" />
                                        <Skeleton className="h-10 flex-1" />
                                        <Skeleton className="h-10 flex-1" />
                                    </div>
                                ))}
                            </div>
                        }
                        <div className="md:max-w-full max-w-xs">
                            {!receiptLoading && tokenMetadata &&
                                <ReceiptTable
                                    receipts={receipts}
                                    paymentRequests={paymentRequests}
                                    onMetadataChange={handleReceiptMetadataChange} />
                            }
                        </div>
                    </CardContent>
                </Card>}
            </div>
        </div>
    )
}
