import { Router, Request, Response, NextFunction } from 'express'
import z from "zod"
import { randomBytes } from 'crypto';

import { asyncHandler } from '../utils'
import { fetchUserSettings, fetchPaymentRequest, getKeyPair, publishBtcPrice, publishPaymentReq, publishEarnRequest } from '../nostr'
import { createLightningInvoice } from '../spark'
import { fetchPrice } from '../btc'
import { db } from '../db'
import { posthog } from '../posthog'
import { IssuerSparkWallet } from '@buildonspark/issuer-sdk';
import { sha256 } from '@nostr-relay/common';
import { nip98 } from 'nostr-tools';

const keypair = getKeyPair(process.env['NSEC'] as string, process.env['NPUB'] as string)
const router = Router()
export const PaymentRequestRouter = router

const EXPIRED_MINUTES = 5

const ItemSchema = z.object({
    title: z.string(),
    description: z.string(),
    amount: z.number(),
})

const PaymentRequestSchema = z.object({
    discountRate: z.number().optional(),
    items: z.array(ItemSchema).min(1),
})

type PaymentRequest = z.infer<typeof PaymentRequestSchema> & { txId?: string, feeType?: 'lightning' | 'token', invoiceId?: string, pubkey?: string }

const parsingPaymentRequestMiddleware = asyncHandler(async (req: Request & { paymentRequest?: PaymentRequest }, res: Response, next: NextFunction) => {
    const { success, data, error } = PaymentRequestSchema.safeParse(req.body)
    if (!success) {
        return res.status(400).json({ error: error })
    }

    req.paymentRequest = data
    return next()
})

const nip98MiddleWare = asyncHandler(async (req: Request & { paymentRequest?: PaymentRequest, auth?: Record<string, string> }, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.auth || !req.auth['nostr']) {
        return res.status(401).json({
            error: 'Missing Nostr Authorization header'
        })
    }

    let nostrToken = req.auth['nostr']
    let padding = '='.repeat((4 - (nostrToken.length % 4)) % 4);
    nostrToken += padding;

    const event = await nip98.unpackEventFromToken(`Nostr ${nostrToken}`)

    const isValid = await nip98.validateEvent(
        event,
        `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        req.method,
        req.body
    )

    if (!isValid) {
        return res.status(401).json({ message: "Invalid NIP-98 signature" })
    }

    req.paymentRequest!.pubkey = event.pubkey
    next()
})

router.post('/payment-request', parsingPaymentRequestMiddleware, nip98MiddleWare, asyncHandler(async (req: Request & { paymentRequest?: PaymentRequest }, res: Response): Promise<Response | void> => {
    const [userSettings, priceResponse] = await Promise.all([
        fetchUserSettings(req.paymentRequest!.pubkey as string),
        fetchPrice()
    ])
    if (!userSettings || !userSettings.sparkIdentityKey) {
        return res.status(403).json({ error: 'spark identity not defined' })
    }

    const { usdPrice } = priceResponse

    const amount = req.paymentRequest!.items?.reduce((acc, i) => acc + i.amount, 0) || 0

    let fullAmount = amount
    if (userSettings) {
        fullAmount *= 1 + (userSettings.org && userSettings.org.vat > 0 ? userSettings.org.vat / 100 : 0)
    }

    const amountSats = Math.round((fullAmount / usdPrice) * 100000000)

    // Programmatic invoice generation
    const { id: invoiceId, invoice: lightningInvoice } = await createLightningInvoice(userSettings.sparkIdentityKey, amountSats, `Bitlasso: payment request's invoice`)
    const { wallet } = await IssuerSparkWallet.initialize({
        options: {
            network: 'MAINNET',
        }
    });
    const redeemAddress = await wallet.getSparkAddress()
    wallet.cleanup()
    const id = sha256(randomBytes(32))

    await publishPaymentReq(keypair, {
        id: id,
        amount: amount,
        lightningInvoice,
        redeemAddress: redeemAddress,
        items: req.paymentRequest!.items,
        discountRate: req.paymentRequest!.discountRate || 0,
        invoiceId,
        pubkey: req.paymentRequest!.pubkey as string,
        sparkIdentityKey: userSettings?.sparkIdentityKey,
        vat: userSettings?.org && userSettings.org.vat > 0 ? userSettings.org.vat : 0
    })
    void (() => posthog.capture({
        distinctId: id,
        event: 'payment_request_created',
        properties: {
            user_id: req.paymentRequest!.pubkey,
            tx_id: req.paymentRequest!.txId as string,
            amount_usd: fullAmount,
            discount_rate: req.paymentRequest!.discountRate,
            fee_type: req.paymentRequest!.feeType,
            payment_request_id: id,
            items_count: req.paymentRequest!.items?.length || 0
        }
    }))()
    res.json({
        id,
        invoice: lightningInvoice,
        url: `https://bitlasso.xyz/#/payment/${id}`
    })
}))

router.get('/payment-request/:id/price', asyncHandler(async (req, res): Promise<Response | void> => {
    const payment = await fetchPaymentRequest(keypair, req.params.id as string)

    if (!payment) {
        return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
    }

    if (payment.settleTx && payment.settleTx != '') {
        return res.status(400).json({ message: "PAYMENT_ALREADY_SETTLED" })
    }

    const quoteRow = db.prepare('SELECT * FROM QUOTES WHERE request_id = ?').get(req.params.id) as { btc: number, expires_at: number } | undefined
    if (quoteRow && Date.now() < quoteRow.expires_at) {
        return res.json({ btc: quoteRow.btc, endtime: quoteRow.expires_at })
    }

    const { usdPrice } = await fetchPrice()
    const date = new Date()
    date.setMinutes(date.getMinutes() + EXPIRED_MINUTES)
    const expiresAt = date.getTime()
    const refPriceID = await publishBtcPrice(keypair, usdPrice, date.getTime(), req.params.id as string)

    let fullAmount = payment.amount
    if (payment.vat) {
        fullAmount *= 1 + (payment.vat / 100)
    }else {
        const userSettings = await fetchUserSettings(payment.pubkey)
        if (userSettings) {
            fullAmount *= 1 + (userSettings.org && userSettings.org.vat > 0 ? userSettings.org.vat / 100 : 0)
        }
    }
    const btc = Math.round((fullAmount / usdPrice) * 100000000) / 100000000
    db.prepare('INSERT OR REPLACE INTO quotes(request_id, btc, expires_at, ref_price_id, usd_price) VALUES(?, ?, ?, ?, ?)').run(req.params.id, btc, expiresAt, refPriceID, usdPrice)

    const { invoice, id } = await createLightningInvoice(payment.sparkIdentityKey, Math.floor(btc * 100000000))
    payment.invoiceId = id
    payment.lightningInvoice = invoice
    await publishPaymentReq(keypair, payment)

    res.json({ btc, endtime: expiresAt, lightningInvoice: invoice })
}))

router.post('/payment-request/:id/earn/:address', asyncHandler(async (req, res): Promise<Response | void> => {
    const payment = await fetchPaymentRequest(keypair, req.params.id as string)
    if (!payment) {
        return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
    }

    if (payment.settleTx && payment.settleTx != '') {
        return res.status(400).json({ message: "PAYMENT_ALREADY_SETTLED" })
    }

    await publishEarnRequest(keypair, req.params.id as string, req.params.address as string)
    res.json({ status: 'OK' })
}))