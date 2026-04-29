import type { Bundle } from "@/components/dashboard/activate-payment";
import type { BreezPayment, TokenBalanceMap, Wallet } from "./wallet";
import { nip98 } from "nostr-tools";

export const API_BASE_URL = import.meta.env.DEV ? "http://localhost:4000" : "https://api.bitlasso.xyz";

export const getApiUrl = (path: string) => {
    return `${API_BASE_URL}${path}`;
}

export const parseLightningInvoiceAmount = (invoice: string): number | undefined => {
    // Parse BOLT11 invoice to extract amount in BTC
    // Format: lnbc<amount><multiplier>...
    // Multipliers: m=milli, u=micro, n=nano, p=pico (default: satoshis)
    try {
        const match = invoice.match(/^lnbc(\d+)([munp]?)/)
        if (!match) return undefined

        const amount = parseInt(match[1], 10)
        console.log('Parsed amount from invoice:', amount)
        const sats = match[2] === 'm' ? amount * 100_000 :
            match[2] === 'u' ? amount * 100 :
                match[2] === 'n' ? amount / 10 :
                    match[2] === 'p' ? amount / 100 :
                        amount / 100_000_000
        return sats / 100_000_000
    } catch (error) {
        console.error('Failed to parse lightning invoice amount:', error)
        return undefined
    }
}

export const getPaymentPrice = async (paymentRequestId: string): Promise<{ btc: number, endtime: number, lightningInvoice?: string } | undefined> => {
    try {
        const response = await fetch(getApiUrl(`/payment-request/${paymentRequestId}/price`))
        if (!response.ok) {
            return undefined
        }

        const { btc, endtime, lightningInvoice } = await response.json()
        return { btc, endtime, lightningInvoice }
    } catch (_e) {
        return undefined
    }
}

export const getStatus = async (): Promise<{ sparkStatus: string }> => {
    const response = await fetch(getApiUrl(`/status`))
    if (!response.ok) {
        throw new Error("Not able to fetch status")
    }

    return await response.json()
}

export type Settings = { tokenAddress: string, bundles: Bundle[], address: string, npub: string, publicKey: string }
export const getSettings = async (): Promise<Settings> => {
    const response = await fetch(getApiUrl(`/settings`))
    if (!response.ok) {
        throw new Error("Not able to fetch settings")
    }

    return await response.json()
}

export const purchaseCredits = async (bundle: string, wallet: Wallet): Promise<{ transferId: string }> => {
    let response = await fetch(getApiUrl(`/payment-request/purchase`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bundle,
            receiverAddress: await wallet.getSparkAddress()
        })
    })

    if (response.status === 402) {
        const authHeader = response.headers.get('WWW-Authenticate')
        if (authHeader) {
            const macaroonMatch = authHeader.match(/macaroon="([^"]+)"/)
            const invoiceMatch = authHeader.match(/invoice="([^"]+)"/)
            if (macaroonMatch && invoiceMatch) {
                const macaroon = macaroonMatch[1]
                const invoice = invoiceMatch[1]
                // Pay the invoice
                const sendPromise = new Promise<BreezPayment>(async (resolve, reject) => {
                    const cleanup = () => {
                        wallet.off('paymentSent', onPaymentSent)
                        wallet.off('paymentFailed', onPaymentFailed)
                    }

                    const onPaymentSent = (payment: BreezPayment) => {
                        cleanup()
                        resolve(payment)
                    }
                    const onPaymentFailed = (error: any) => {
                        cleanup()
                        reject(error)
                    }

                    wallet.on('paymentSent', onPaymentSent)
                    wallet.on('paymentFailed', onPaymentFailed)

                    await wallet.sendLightningPayment(invoice).catch((e) => {
                        cleanup()
                        reject(e)
                    })
                })

                const payment = await sendPromise

                if (payment && payment.details?.type == 'lightning') {
                    const preimage = payment.details.htlcDetails.preimage
                    if (preimage) {
                        // Retry with Authorization header
                        response = await fetch(getApiUrl(`/payment-request/purchase`), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `L402 ${macaroon}:${preimage}`
                            },
                            body: JSON.stringify({
                                bundle,
                                receiverAddress: await wallet.getSparkAddress()
                            })
                        })
                    }
                }
            }
        }
    }

    if (!response.ok) {
        throw new Error("Not able to purchase credits")
    }

    return await response.json()
}

export const publishPaymentRequest = async (settings: Settings, wallet: Wallet, amount: number, discountRate: number, description?: string, tokenBalances?: TokenBalanceMap) => {
    try {
        const paymentRequest = {
            amount: amount,
            description: description || '',
            discountRate
        }

        const authToken = await nip98.getToken(getApiUrl(`/payment-request`), 'POST', (e) => wallet.signNostrEvent(e), true, paymentRequest)

        let response = await fetch(getApiUrl(`/payment-request`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${authToken}`
            },
            body: JSON.stringify(paymentRequest)
        })

        if (response.status === 402) {
            const authHeader = response.headers.get('WWW-Authenticate')
            if (authHeader) {
                const macaroonMatch = authHeader.match(/macaroon="([^"]+)"/)
                const invoiceMatch = authHeader.match(/invoice="([^"]+)"/)
                const tokenInvoiceMatch = authHeader.match(/tokenInvoice="([^"]+)"/)

                const availableCredits = tokenBalances?.get(settings.tokenAddress)?.balance || 0

                if (macaroonMatch && tokenInvoiceMatch && availableCredits > 0) {
                    const macaroon = macaroonMatch[1]
                    const tokenInvoice = tokenInvoiceMatch[1]
                    // Pay the invoice
                    const sendPromise = new Promise<BreezPayment>(async (resolve, reject) => {
                        const cleanup = () => {
                            wallet.off('paymentSent', onPaymentSent)
                            wallet.off('paymentFailed', onPaymentFailed)
                        }

                        const onPaymentSent = (payment: BreezPayment) => {
                            cleanup()
                            resolve(payment)
                        }
                        const onPaymentFailed = (error: any) => {
                            cleanup()
                            reject(error)
                        }

                        wallet.on('paymentSent', onPaymentSent)
                        wallet.on('paymentFailed', onPaymentFailed)

                        await wallet.paySparkInvoice(tokenInvoice).catch((e) => {
                            cleanup()
                            reject(e)
                        })
                    })
                    const payment = await sendPromise
                    if (payment && payment.details?.type == 'token') {
                        const txHash = payment.details.txHash
                        if (txHash) {
                            //  Retry with Authorization header
                            response = await fetch(getApiUrl(`/payment-request`), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `${authToken}; L402 ${macaroon}:${txHash}`
                                },
                                body: JSON.stringify(paymentRequest)
                            })
                        }
                    }
                }
                else if (macaroonMatch && invoiceMatch) {
                    const macaroon = macaroonMatch[1]
                    const invoice = invoiceMatch[1]

                    // Pay the invoice
                    const sendPromise = new Promise<BreezPayment>(async (resolve, reject) => {
                        const cleanup = () => {
                            wallet.off('paymentSent', onPaymentSent)
                            wallet.off('paymentFailed', onPaymentFailed)
                        }

                        const onPaymentSent = (payment: BreezPayment) => {
                            cleanup()
                            resolve(payment)
                        }
                        const onPaymentFailed = (error: any) => {
                            cleanup()
                            reject(error)
                        }

                        wallet.on('paymentSent', onPaymentSent)
                        wallet.on('paymentFailed', onPaymentFailed)

                        await wallet.sendLightningPayment(invoice).catch((e) => {
                            cleanup()
                            reject(e)
                        })
                    })

                    const payment = await sendPromise

                    console.log(payment)
                    if (payment && payment.details?.type == 'lightning') {
                        const preimage = payment.details.htlcDetails.preimage
                        if (preimage) {
                            // Retry with Authorization header
                            response = await fetch(getApiUrl(`/payment-request`), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `${authToken}; L402 ${macaroon}:${preimage}`
                                },
                                body: JSON.stringify(paymentRequest)
                            })
                        }
                    }

                }
            }
        }
        if (!response.ok) {
            throw new Error("Not able to publish payment request")
        }

        return await response.json()
    }
    catch (e) {
        console.log(e)
        throw e
    }
}