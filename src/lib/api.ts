import type { Bundle } from "@/components/app/activate-payment";
import type { Wallet } from "./wallet";

export const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3000" : "https://api.bitlasso.xyz";

export const getApiUrl = (path: string) => {
    return `${API_BASE_URL}${path}`;
}

export const getPaymentPrice = async (paymentRequestId: string): Promise<{ btc: number, endtime: number } | undefined> => {
    const response = await fetch(getApiUrl(`/payment-request/${paymentRequestId}/price`))
    if (!response.ok) {
        return undefined
    }

    const { btc, endtime } = await response.json()
    return { btc, endtime }
}

export const getStatus = async (): Promise<{ sparkStatus: string }> => {
    const response = await fetch(getApiUrl(`/status`))
    if (!response.ok) {
        throw new Error("Not able to fetch status")
    }

    return await response.json()
}

export type Settings = { tokenAddress: string, bundles: Bundle[], address: string, npub: string }
export const getSettings = async (): Promise<Settings> => {
    const response = await fetch(getApiUrl(`/settings`))
    if (!response.ok) {
        throw new Error("Not able to fetch settings")
    }

    return await response.json()
}

export const purchaseCredits = async (paymentId: string, amount: number, walletAddress: string): Promise<{ transferId: string }> => {
    const response = await fetch(getApiUrl(`/payment-request/purchase`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txId: paymentId,
            creditAmount: amount,
            receiverAddress: walletAddress
        })
    })
    if (!response.ok) {
        throw new Error("Not able to fetch settings")
    }

    return await response.json()
}

export const publishPaymentRequest = async (txId: string, wallet: Wallet, nonce: number, amount: number, tokenId: string, discountRate: number, description?: string) => {
    const btcAddress = await wallet.createBitcoinAddress(nonce);
    const sparkAddress = await wallet.createSparkAddress(nonce)

    const subLightningWallet = await wallet.withAccountNumber(nonce)
    const { invoice: lightningInvoice } = await subLightningWallet.createLightningInvoice();

    const pubkey = wallet.getNostrPublicKey()

    const response = await fetch(getApiUrl(`/payment-request`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txId,
            nonce,
            amount,
            tokenId,
            btcAddress,
            sparkAddress,
            lightningInvoice,
            discountRate,
            description,
            pubkey
        })
    })
    if (!response.ok) {
        throw new Error("Not able to publish payment request")
    }

    return await response.json()
}