import { bech32 } from '@scure/base';
import dotenv from 'dotenv'
dotenv.config()

import { Filter, finalizeEvent, nip04, SimplePool, type Event } from "nostr-tools";

const pool = new SimplePool();
const PORT = process.env.PORT || 4000;
const BACKEND_RELAY = process.env.BACKEND_RELAY_URL || `ws://127.0.0.1:${PORT}/nostr`
const BACKUP_RELAIS = [
    'wss://relay.nostrcheck.me',
    'wss://relay.nostriches.club',
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://relay.primal.net'
]
const RELAYS = [BACKEND_RELAY, ...BACKUP_RELAIS]

export type KeyPair = {
    publicKey: string,
    privateKey: Uint8Array
}

export const getKeyPair = (nsec: string, npub: string): KeyPair => {
    const { bytes: pubBytes } = bech32.decodeToBytes(npub);
    const publicKey = Buffer.from(pubBytes).toString('hex');
    const { bytes: pvBytes } = bech32.decodeToBytes(nsec);

    return {
        publicKey,
        privateKey: pvBytes
    }
}

const fetchRelayEvents = async (relay: string, filter: Filter, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const events = await pool.querySync([relay], filter)
            return { relay, events }
        } catch (err) {
            if (i === retries - 1) {
                console.error(`Failed to fetch events from ${relay} after ${retries} attempts:`, err)
                return { relay, events: [] as Event[] }
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
    }
    return { relay, events: [] as Event[] }
}

const mergeEvents = (results: Array<{ relay: string, events: Event[] }>) => {
    const allIds = new Set<string>()
    const merged: Event[] = []
    for (const { events } of results) {
        for (const e of events) {
            if (!allIds.has(e.id)) {
                allIds.add(e.id)
                merged.push(e)
            }
        }
    }
    return merged
}

const replicateMissing = async (results: Array<{ relay: string, events: Event[] }>, merged: Event[]) => {
    await Promise.allSettled(
        results.map(({ relay, events }) => {
            const relayIds = new Set(events.map(e => e.id))
            const missing = merged.filter(e => !relayIds.has(e.id))

            if (missing.length === 0) return Promise.resolve()

            console.log(`pushing ${missing.length} missing events to ${relay}`)
            return Promise.allSettled(
                missing.map(e => pool.publish([relay], e))
            )
        })
    )
}

const fetchAndSync = async (filter: Filter) => {
    const primaryResult = await fetchRelayEvents(BACKEND_RELAY, filter)
        .catch(() => {
            return { relay: BACKEND_RELAY, events: [] }
        })

    const backupPromises = BACKUP_RELAIS.map(relay => fetchRelayEvents(relay, filter))

    if (primaryResult.events.length > 0) {
        void (async () => {
            const backupResults = await Promise.all(backupPromises)
            const merged = mergeEvents([primaryResult, ...backupResults])
            await replicateMissing([primaryResult, ...backupResults], merged)
        })()
        return primaryResult.events
    }

    const backupResults = await Promise.all(backupPromises)
    const merged = mergeEvents([primaryResult, ...backupResults])
    await replicateMissing([primaryResult, ...backupResults], merged)

    return merged
}

export const publishBtcPrice = async (nostrKeys: KeyPair, usdPrice: number, expiresAt: number, ref: string) => {
    const event = {
        kind: 30078,
        content: JSON.stringify({
            usdPrice,
            expiresAt,
            pair: 'BTC-USD',
            source: 'blockchain.info'
        }),
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', `bitlasso/btc-price/${ref}`],
            ['e', ref, '', 'payment-request']
        ]
    }

    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    try {
        await Promise.any(pool.publish(RELAYS, signedEvent))
    } catch (err) {
        console.error('Failed to publish BTC price to any relay:', err)
    }
    return signedEvent.id
}

export type FullPaymentRequest = PaymentRequest & RedeemRequest & SettlementRequest

type Item = {
    title: string,
    description?: string,
    amount: number
}

export type PaymentRequest = {
    id: string,
    amount: number;
    items?: Item[]
    lightningInvoice: string,
    discountRate: number,
    redeemAddress: string,
    createdAt: Date
    invoiceId: string,
    pubkey: string
    sparkIdentityKey: string,
    vat: number,
    eventId?: string
}

export type PaymentRequestBody = Omit<PaymentRequest, 'id' | 'createdAt'>

export type PaymentRequestContent = Omit<PaymentRequest, 'createdAt'>

export type RedeemRequest = {
    redeemAmount: number,
    redeemTx: string,
}

export type SettlementRequest = {
    settlementMode: "spark" | "btc" | "lightning",
    settleTx: string,
    refPriceId?: string
}

export const fetchPaymentRequest = async (nostrKeys: KeyPair, id: string): Promise<FullPaymentRequest | undefined> => {
    const events = await fetchAndSync({
        authors: [nostrKeys.publicKey],
        "#d": [`bitlasso/req/${id}`]
    });
    if (events.length == 0) {
        return undefined
    }

    const { id: eventId, content, created_at } = events[0]
    let paymentRequest = JSON.parse(content) as FullPaymentRequest
    paymentRequest.id = id
    paymentRequest.eventId = eventId

    paymentRequest.createdAt = new Date(created_at * 1000)
    paymentRequest.pubkey = getTag(events[0].tags, 'p') as string

    const paymentDetails = await fetchPayment(nostrKeys, id)
    if (paymentDetails) {
        const { settlementMode, settleTx } = paymentDetails
        paymentRequest.settleTx = settleTx
        paymentRequest.settlementMode = settlementMode
    }

    const redeemDetails = await fetchRedeem(nostrKeys, id)
    if (redeemDetails) {
        paymentRequest.redeemAmount = redeemDetails.redeemAmount
        paymentRequest.redeemTx = redeemDetails.redeemTx
    }

    return paymentRequest
}

export const publishPayment = async (nostrKeys: KeyPair, paymentRequest: PaymentRequest, tx: string, settlementMode: 'spark' | 'btc', refPriceId: string) => {
    const event = {
        kind: 30078,
        content: JSON.stringify({ settlementMode, transaction: tx }),
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', `bitlasso/payment/${paymentRequest.id}`],
            ['e', paymentRequest.eventId as string, '', 'payment-request'],
            ['e', refPriceId, '', 'price-ref']
        ]
    }

    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    try {
        await Promise.any(pool.publish(RELAYS, signedEvent))
    } catch (err) {
        console.error(`Failed to publish payment for request ${paymentRequest.id} to any relay:`, err)
    }
    return signedEvent.id
}

export const fetchPayment = async (nostrKeys: KeyPair, requestId: string): Promise<SettlementRequest | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [nostrKeys.publicKey],
        "#d": [`bitlasso/payment/${requestId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    const { settlementMode, transaction } = JSON.parse(events[0].content)

    return {
        settlementMode,
        settleTx: transaction,
        refPriceId: getTagByMarker(events[0].tags, 'e', 'price-ref')
    }
}

export const fetchRedeem = async (nostrKeys: KeyPair, requestId: string): Promise<RedeemRequest | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [nostrKeys.publicKey],
        "#d": [`bitlasso/redeem/${requestId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    const { redeemAmount, redeemTransaction } = JSON.parse(events[0].content)
    return { redeemAmount, redeemTx: redeemTransaction }
}

export const publishRedeem = async (nostrKeys: KeyPair, requestId: string, amount: number, tx: string) => {
    const event = {
        kind: 30078,
        content: JSON.stringify({ redeemAmount: amount, redeemTransaction: tx }),
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', `bitlasso/redeem/${requestId}`],
            ['e', requestId, '', 'payment-request']
        ]
    }

    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    try {
        await Promise.any(pool.publish(RELAYS, signedEvent))
    } catch (err) {
        console.error(`Failed to publish redeem for request ${requestId} to any relay:`, err)
    }
    return signedEvent.id
}

export const findPaymentRecipientAuthor = async (id: string) => {
    const events = await fetchAndSync({
        ids: [id]
    });
    if (events.length == 0) {
        return undefined
    }

    return getTag(events[0].tags, 'p')
}

export type NotificationSettings = {
    email?: string
    npub?: string
    webhook?: string
}

export const findNotificationSettings = async (authorPubkey: string) => {
    const events = await fetchAndSync({
        kinds: [30078], //  settings
        authors: [authorPubkey],
        "#d": ["bitlasso/settings"] // link to notification settings
    });
    if (events.length > 0) {
        const { content } = events[0]
        return JSON.parse(content) as NotificationSettings
    }
    return undefined
}

export const sendMessage = async (nostrKeys: KeyPair, npub: string, message: string) => {
    const { bytes: pubBytes } = bech32.decodeToBytes(npub);
    const publicKey = Buffer.from(pubBytes).toString('hex');
    const content = await nip04.encrypt(nostrKeys.privateKey, publicKey, message)
    const event = {
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['p', publicKey]
        ],
        content,
    }
    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    await Promise.allSettled(pool.publish(BACKUP_RELAIS, signedEvent))
}


export const publishPaymentReq = async (nostrKeys: KeyPair, paymentReq: PaymentRequestContent) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(paymentReq),
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', `bitlasso/req/${paymentReq.id}`],
            ['p', paymentReq.pubkey],
            ['t', 'bitlasso/req']
        ]
    }

    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    try {
        await Promise.any(pool.publish(RELAYS, signedEvent))
    } catch (err) {
        console.error(`Failed to publish payment request  to any relay:`, err)
    }
}

export const hasPaymentRequestByTxID = async (nostrKeys: KeyPair, txId: string) => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [nostrKeys.publicKey],
        "#d": [`bitlasso/req/${txId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    return events[0].id
}

const getTag = (tags: string[][], name: string) => tags.find(t => t[0] === name)?.[1]
const getTagByMarker = (tags: string[][], name: string, marker: string) =>
    tags.find(t => t[0] === name && t[3] === marker)?.[1]

export const fetchLastNonce = async (pubkey: string): Promise<number> => {
    const events = await fetchAndSync({
        kinds: [30078],
        "#t": ["bitlasso/req"],
        "#p": [pubkey]
    });

    if (events.length == 0) return 2

    const promiseResults = await Promise.allSettled(events.map(e => {
        const { nonce } = JSON.parse(e.content)
        return nonce as number
    }))
    return promiseResults
        .filter(p => p.status == 'fulfilled')
        .map(p => p.value)
    [0]
}

type OrgSettings = {
    name: string
    vat: number
    registrationNumber: string
}

export type UserSettings = {
    sparkIdentityKey?: string
    org?: OrgSettings
}

export const fetchUserSettings = async (pubkey: string): Promise<UserSettings | undefined> => {
    try {
        const events = await fetchAndSync({
            kinds: [30078],
            authors: [pubkey],
            "#d": ["bitlasso/settings"]
        });
        if (events.length > 0) {
            const { content } = events[0]
            return JSON.parse(content) as UserSettings
        }
        return undefined
    }
    catch (e) {
        console.error(e)
        return undefined
    }
}

export const fetchEarnRequest = async (nostrKeys: KeyPair, requestId: string): Promise<{ sparkAddress: string } | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [nostrKeys.publicKey],
        "#d": [`bitlasso/earn/${requestId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    return JSON.parse(events[0].content) as { sparkAddress: string }
}

export const publishEarnRequest = async (nostrKeys: KeyPair, requestId: string, sparkAddress: string): Promise<void> => {
    const event = {
        kind: 30078,
        content: JSON.stringify({
            sparkAddress
        }),
        pubkey: nostrKeys.publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', `bitlasso/earn/${requestId}`],
        ]
    }

    const signedEvent = finalizeEvent(event, nostrKeys.privateKey)
    try {
        await Promise.any(pool.publish(RELAYS, signedEvent))
    } catch (err) {
        console.error(`Failed to publish payment request  to any relay:`, err)
    }
}