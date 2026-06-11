import { FullPaymentRequest } from "../nostr"

export const notifyByWebhook = async (paymentRequest: FullPaymentRequest, webhook: string) => {
    try {
        await fetch(webhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentRequest)
        })
    }
    catch{}
}