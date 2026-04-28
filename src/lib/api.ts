import type { Bundle } from "@/components/dashboard/activate-payment";
import type { BreezPayment, TokenBalanceMap, Wallet } from "./wallet";
import { fetchOrganizationSettings } from "./nostr";
import { nip44 } from "nostr-tools";
import { bytesToHex } from "nostr-tools/utils";
import { encryptData } from "./utils";

export const API_BASE_URL = import.meta.env.DEV ? "http://localhost:4000" : "https://api.bitlasso.xyz";

export const getApiUrl = (path: string) => {
    return `${API_BASE_URL}${path}`;
}

export const getPaymentPrice = async (paymentRequestId: string): Promise<{ btc: number, endtime: number, lightningInvoice?: string } | undefined> => {
    const response = await fetch(getApiUrl(`/payment-request/${paymentRequestId}/price`))
    if (!response.ok) {
        return undefined
    }

    const { btc, endtime, lightningInvoice } = await response.json()
    return { btc, endtime, lightningInvoice }
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
                    wallet.on('paymentSent', (payment: BreezPayment) => {
                        resolve(payment)
                    })
                    wallet.on('paymentFailed', (error) => {
                        reject(error)
                    })
                    await wallet.sendLightningPayment(invoice)
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

export const publishPaymentRequest = async (settings: Settings, wallet: Wallet, nonce: number, amount: number, tokenId: string, discountRate: number, description?: string, tokenBalances?: TokenBalanceMap) => {
    try {
        const pubkey = wallet.getNostrPublicKey()
        const sharingKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256 // Can be 128, 192, or 256
            },
            true, // Set to true if you need to export the key later
            ["encrypt", "decrypt"] // Key usages
        );

        const conversationKey = wallet.ecdhNostrKey(pubkey)
        if (!conversationKey) {
            throw new Error("Not able to get conversation key")
        }
        const exportedKey = await window.crypto.subtle.exportKey("raw", sharingKey);
        const encryptedSharingKey = nip44.encrypt(bytesToHex(new Uint8Array(exportedKey)), conversationKey)

        const orgSettings = await fetchOrganizationSettings(wallet)
        let encryptedOrgDetails: string | undefined = undefined
        if (orgSettings) {
            encryptedOrgDetails = await encryptData(new TextEncoder().encode(JSON.stringify(orgSettings)).buffer, sharingKey)
        }

        let encryptedDescription: string | undefined = undefined
        if (description && description != '') {
            encryptedDescription = await encryptData(new TextEncoder().encode(description).buffer, sharingKey)
        }

        const paymentRequest = {
            userId: pubkey,
            pubkey: await wallet.getIdentityPubkey(),
            nonce,
            amount: amount * (1 + (orgSettings?.vat || 0)),
            description: encryptedDescription || '',
            discountRate,
            tokenId,
            orgDetails: encryptedOrgDetails,
            sharingKey: encryptedSharingKey
        }

        let response = await fetch(getApiUrl(`/payment-request`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
                        wallet.on('paymentSent', (payment: BreezPayment) => {
                            resolve(payment)
                        })
                        wallet.on('paymentFailed', (error) => {
                            reject(error)
                        })
                        await wallet.paySparkInvoice(tokenInvoice)
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
                                    'Authorization': `L402 ${macaroon}:${txHash}`
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
                        wallet.on('paymentSent', (payment: BreezPayment) => {
                            resolve(payment)
                        })
                        wallet.on('paymentFailed', (error) => {
                            reject(error)
                        })
                        await wallet.sendLightningPayment(invoice)
                    })

                    const payment = await sendPromise

                    if (payment && payment.details?.type == 'lightning') {
                        const preimage = payment.details.htlcDetails.preimage
                        if (preimage) {
                            // Retry with Authorization header
                            response = await fetch(getApiUrl(`/payment-request`), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `L402 ${macaroon}:${preimage}`
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