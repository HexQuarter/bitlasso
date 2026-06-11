import { Database } from "better-sqlite3"
import { fetchEarnRequest, fetchPaymentRequest, findNotificationSettings, findPaymentRecipientAuthor, FullPaymentRequest, KeyPair, publishPayment, publishPaymentReq, publishRedeem } from "../nostr"
import { syncWallet, checkLightningInvoiceSettlementTransaction, getSparkTokenTransfer, createLightningInvoice, mintAndTransferToken, getTokenAddress } from "../spark"
import { notifyByEmail } from "../notif/mail"
import { notifByNpub } from "../notif/nostr"
import { posthog } from "../posthog"
import { notifyByWebhook } from "../notif/webhook"

export async function startPollingPendingPayments(
    db: Database,
    keypair: KeyPair,
    intervalMs = 10_000
) {
    let stopped = false

    const poll = async () => {
        if (stopped) return

        try {
            await confirmPendingPayments(db, keypair)
        } catch (err) {
            console.error('Poll error:', err)
        }

        // Only schedule the next tick AFTER the current one finishes
        if (!stopped) setTimeout(poll, intervalMs)
    }

    poll() // kick off immediately

    return () => { stopped = true } // returns a stop function
}

const confirmPendingPayments = async (db: Database, keypair: KeyPair) => {
    // Ensure wallet is healthy
    await syncWallet()

    // Clean up quotes that expired more than 1 hour ago
    // Note: expires_at is stored in milliseconds
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    db.prepare('DELETE FROM quotes WHERE expires_at < ?').run(oneHourAgo)

    const pendingQuotes = db.prepare('SELECT * FROM QUOTES').all() as { request_id: string, btc: number, expires_at: number, ref_price_id: string, usd_price: number }[]
    if (pendingQuotes.length === 0) return

    await Promise.all(pendingQuotes.map(async (quote) => {
        const paymentRequest = await fetchPaymentRequest(keypair, quote.request_id)
        if (paymentRequest) {
            const invoiceId = paymentRequest.invoiceId
            if (invoiceId) {
                const sparkIDTx = await checkLightningInvoiceSettlementTransaction(invoiceId)
                if (sparkIDTx) {
                    await publishPayment(keypair, paymentRequest, sparkIDTx, 'spark', quote.ref_price_id)
                    db.prepare('DELETE FROM quotes WHERE request_id = ?').run(quote.request_id)
                    posthog.capture({
                        distinctId: quote.request_id,
                        event: 'payment_settled',
                        properties: {
                            payment_request_id: paymentRequest.id,
                            settlement_mode: 'lightning',
                            btc_amount: quote.btc,
                            usd_price: quote.usd_price,
                            tx_id: sparkIDTx,
                        }
                    })

                    paymentRequest.settlementMode = 'spark'
                    paymentRequest.settleTx = sparkIDTx
                    notifyComplete(paymentRequest, keypair)

                    try {
                        const earnRequest = await fetchEarnRequest(keypair, paymentRequest.id)
                        if (earnRequest) {
                            const fullAmount = paymentRequest.items?.reduce((acc, i) => acc + i.amount, 0) || 0
                            if (fullAmount > 0) {
                                await mintAndTransferToken(fullAmount, earnRequest.sparkAddress)
                                posthog.capture({
                                    distinctId: quote.request_id,
                                    event: 'minting_credits',
                                    properties: {
                                        payment_request_id: paymentRequest.id,
                                        amount: fullAmount,
                                        tx_id: sparkIDTx
                                    }
                                })
                            }
                        }
                    }
                    catch(e) {
                        console.log(`Cannot mint and send BITL to the earn requested address`, e)
                    }
                }
            }

            // Check redemption to apply discount
            if (!paymentRequest.redeemTx) {
                const maxRedeemable = paymentRequest.amount * (paymentRequest.discountRate / 100)
                const maxRedeemableToken = Math.floor(Math.max(0, maxRedeemable))
                const tokenAddress = await getTokenAddress()
                const redeemProof = await getSparkTokenTransfer(paymentRequest.redeemAddress, tokenAddress, maxRedeemableToken)
                if (redeemProof) {
                    const remainingBtc = Math.round(((paymentRequest.amount - (redeemProof.amount)) / quote.usd_price) * 100000000) / 100000000
                    const { invoice, id } = await createLightningInvoice(paymentRequest.sparkIdentityKey, Math.floor(remainingBtc * 100000000))

                    const paymentReq = {
                        ...paymentRequest,
                        amount: paymentRequest.amount - redeemProof.amount,
                        invoiceId: id,
                        lightningInvoice: invoice,
                    }

                    await publishPaymentReq(keypair, paymentReq)
                    await publishRedeem(keypair, quote.request_id, redeemProof.amount, redeemProof.transactionId)

                    db.prepare('UPDATE quotes SET btc = ? WHERE request_id = ?').run(remainingBtc, quote.request_id)
                    paymentRequest.amount - redeemProof.amount
                    posthog.capture({
                        distinctId: quote.request_id,
                        event: 'token_redemption_applied',
                        properties: {
                            payment_request_id: quote.request_id,
                            redeemed_tokens: redeemProof.amount,
                            redeem_tx_id: redeemProof.transactionId,
                            remaining_btc: remainingBtc,
                        }
                    })
                }
            }
        }
    }))
}

const notifyComplete = async (paymentRequest: FullPaymentRequest, keypair: KeyPair) => {
    const pubkey = await findPaymentRecipientAuthor(paymentRequest.id)
    const notifSettings = pubkey ? await findNotificationSettings(pubkey) : undefined

    if (notifSettings?.email) {
        notifyByEmail(paymentRequest, notifSettings.email)
    }

    if (notifSettings?.npub) {
        notifByNpub(paymentRequest, keypair, notifSettings.npub)
    }

    if (notifSettings?.webhook) {
        notifyByWebhook(paymentRequest, notifSettings.webhook)
    }
}