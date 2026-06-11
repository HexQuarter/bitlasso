import { FullPaymentRequest, KeyPair, sendMessage } from "../nostr"

export const notifByNpub = async (paymentRequest: FullPaymentRequest, keypair: KeyPair, npub: string) => {
    await sendMessage(keypair, npub, `
    ⚡ $${paymentRequest.amount + (paymentRequest.redeemAmount || 0)} received.

    See payment certificate:
    👉 https://bitlasso.xyz/#/payment/${paymentRequest.id}
    `)
}