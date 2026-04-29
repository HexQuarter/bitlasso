import { SimplePool, getPublicKey, type Filter, type Event, type NostrEvent } from "nostr-tools"

import { HDKey } from "@scure/bip32";
import { bech32 } from "bech32";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { mnemonicToSeedSync } from "@scure/bip39";
import type { Wallet } from "./wallet";
import type { Receipt } from "@/components/dashboard/receipt-table";
import type { Settings } from "./api";

const pool = new SimplePool({
    enablePing: true,
    enableReconnect: true
});

const BACKEND_RELAY = import.meta.env.DEV ? "ws://localhost:4000/nostr" : "wss://api.bitlasso.xyz/nostr"
const BACKUP_RELAIS = [
    "wss://relay.damus.io",
    "wss://relay.primal.net",
    "wss://nos.lol"
];
const RELAYS = [BACKEND_RELAY, ...BACKUP_RELAIS]

export type NostrKeyPair = {
    pub: string
    priv: string
    npub: string
    nsec: string
}

export const getNostrKeyPair = (mnemonic: string): NostrKeyPair => {
    const seed = mnemonicToSeedSync(mnemonic)
    const hdkey = HDKey.fromMasterSeed(seed);
    const privateKey = hdkey.derive("m/44'/1237'/0'/0/0").privateKey;
    if (!privateKey) {
        throw new Error('Cannot derive Nostr private key')
    }
    const publicKey = getPublicKey(privateKey)
    const pkBytes = hexToBytes(publicKey);

    const nsec = bech32.encode('nsec', bech32.toWords(privateKey));
    const npub = bech32.encode('npub', bech32.toWords(pkBytes));
    return {
        pub: publicKey,
        priv: bytesToHex(privateKey),
        nsec: nsec,
        npub: npub
    }
}

const fetchRelayEvents = async (relay: string, filter: Filter) => {
    try {
        const events = await pool.querySync([relay], filter)
        return { relay, events }
    } catch {
        return { relay, events: [] as Event[] }
    }
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

            console.log(`pushing ${missing.length} missing events to ${relay}`, missing)
            return Promise.allSettled(
                missing.map(e => pool.publish([relay], e))
            )
        })
    )
}

const fetchAndSync = async (filter: Filter) => {
    console.log('fetching events with filter', filter)
    const backupPromises = BACKUP_RELAIS.map(relay => fetchRelayEvents(relay, filter))
    const primaryResult = await fetchRelayEvents(BACKEND_RELAY, filter)
    const backupResults = await Promise.all(backupPromises)
    console.log(backupResults)
    const merged = mergeEvents([primaryResult, ...backupResults])
    await replicateMissing([primaryResult, ...backupResults], merged)
    return merged
}

const subscribeAndSync = (
    filter: Filter,
    onEvent: (event: Event) => void,
): { close: () => void } => {
    // Track which events each relay has seen
    const relaysSeen = new Map<string, Set<string>>(
        RELAYS.map(r => [r, new Set()])
    );

    const deliveredEvents = new Set<string>(); // track delivered events

    const subs = RELAYS.map(relay => {
        return pool.subscribeMany([relay], filter, {
            onevent(event) {
                // Mark this relay as having the event
                relaysSeen.get(relay)!.add(event.id);

                // Only deliver once across all relays
                if (!deliveredEvents.has(event.id)) {
                    deliveredEvents.add(event.id);
                    onEvent(event); // // Deliver to caller exactly once per unique event
                }

                // Push to every relay that doesn't have it yet
                for (const r of RELAYS) {
                    if (!relaysSeen.get(r)!.has(event.id)) {
                        pool.publish([r], event)
                    }
                }
            },
        });
    });

    return {
        close: () => subs.forEach(sub => sub.close()),
    };
}

export type OrgSettings = {
    name: string
    vat: number
    registrationNumber: string
}

export type NotificationSettings = {
    email?: string
    npub?: string
    webhook?: string
}

export type UserSettings = {
    sparkIdentityKey?: string
    redeemTokenId?: string,
    notification?: NotificationSettings,
    org?: OrgSettings
}

export const fetchSettings = async (wallet: Wallet): Promise<UserSettings | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [wallet.getNostrPublicKey()],
        "#d": ["bitlasso/settings"]
    });
    if (events.length > 0) {
        const { content } = events[0]
        return JSON.parse(content) as UserSettings
    }
    return undefined
}

export const fetchSettingsByPubkey = async (pubkey: string): Promise<UserSettings | undefined> => {
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

export const registerOrganizationSettings = async (wallet: Wallet, orgSettings: OrgSettings) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(orgSettings),
        pubkey: wallet.getNostrPublicKey(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/org_settings"]],
    }

    const signedEvent = wallet.signNostrEvent(event);
    await Promise.any(pool.publish(RELAYS, signedEvent))
    return signedEvent.id
}

export const registerSettings = async (wallet: Wallet, settings: UserSettings) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(settings),
        pubkey: wallet.getNostrPublicKey(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/settings"]],
    }

    const signedEvent = wallet.signNostrEvent(event);
    await Promise.any(pool.publish(RELAYS, signedEvent))
    return signedEvent.id
}

export const fetchPaymentsRequest = async (wallet: Wallet, settings?: Settings): Promise<PaymentRequest[]> => {
    const events = await fetchAndSync({
        kinds: [30078],
        "#t": ["bitlasso/req"],
        "#p": [wallet.getNostrPublicKey()]
    });

    if (events.length == 0) return []

    const promiseResults = await Promise.allSettled(events.map(e => eventToPaymentRequest(e, settings)))

    return promiseResults
        .filter(p => p.status === 'fulfilled')
        .map(p => p.value)
}

export const fetchPaymentRequest = async (settings: Settings, id: string): Promise<PaymentRequest> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": ["bitlasso/req/" + id]
    });

    if (events.length == 0) {
        throw new Error('Payment not found')
    }

    return eventToPaymentRequest(events[0], settings)
}

const eventToPaymentRequest = async (event: NostrEvent, settings?: Settings) => {
    try {
        const { created_at, content } = event
        let paymentRequest = JSON.parse(content) as PaymentRequest
        const pubkey = getTag(event.tags, "p") as string

        const dTag = getTag(event.tags, 'd')
        if (!dTag) {
            throw new Error('Invalid event')
        }
        const id = dTag.split('/').at(-1) as string

        paymentRequest.id = id
        paymentRequest.pubkey = pubkey
        paymentRequest.createdAt = new Date(created_at * 1000)
        if (settings) {
            const [paymentDetails, redeemDetails] = await Promise.all([
                fetchPaymentDetails(settings, paymentRequest.id),
                fetchRedeemDetails(settings, paymentRequest.id),
            ])
            if (paymentDetails) {
                const { settlementMode, transaction } = paymentDetails
                paymentRequest.settleTx = transaction
                paymentRequest.settlementMode = settlementMode
            }
            if (redeemDetails) {
                paymentRequest.redeemAmount = redeemDetails.redeemAmount
                paymentRequest.redeemTx = redeemDetails.transaction
            }
        }

        return paymentRequest
    }
    catch (e) {
        throw e
    }
}

const fetchPaymentDetails = async (settings: Settings, requestId: string) => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/payment/${requestId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    const { settlementMode, transaction } = JSON.parse(events[0].content)

    return {
        settlementMode,
        transaction,
        refPriceId: getTagByMarker(events[0].tags, 'e', 'price-ref') as string
    }
}

const fetchRedeemDetails = async (settings: Settings, requestId: string) => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/redeem/${requestId}`],
    });
    if (events.length == 0) {
        return undefined
    }

    const { redeemAmount, redeemTransaction } = JSON.parse(events[0].content)
    return { redeemAmount, transaction: redeemTransaction }
}

export type PaymentRequest = {
    id: string,
    pubkey: string,
    amount: number;
    description: string | undefined;
    lightningInvoice: string,
    redeemAddress: string,
    settleTx: string | undefined,
    discountRate: number,
    tokenId: string,
    createdAt: Date
    redeemAmount?: number
    redeemTx?: string
    nonce: number
    settlementMode: "spark" | "btc"
    orgDetails?: OrgSettings
    invoiceId: string
}

export const publishReceiptMetadata = async (wallet: Wallet, transactionId: string, amount: number, createdAt: Date, description?: string, recipient?: string, paymentId?: string) => {
    const event = {
        kind: 30078,
        content: JSON.stringify({
            amount,
            description,
            recipient,
            transactionId
        }),
        pubkey: wallet.getNostrPublicKey(),
        created_at: Math.floor(createdAt.getTime() / 1000),
        tags: [
            ["d", `bitlasso/receipt/${transactionId}`],
            ["t", "bitlasso/receipt"]
        ]
    }

    if (paymentId) {
        event.tags.push(["e", paymentId, "", "payment-request"])
    }

    const signedEvent = wallet.signNostrEvent(event);
    await Promise.any(pool.publish(RELAYS, signedEvent))
    return signedEvent.id
}

export const listReceipts = async (wallet: Wallet): Promise<Receipt[]> => {
    const events = await pool.querySync(RELAYS, {
        kinds: [30078],
        authors: [wallet.getNostrPublicKey()],
        "#t": ["bitlasso/receipt"]
    });
    if (events.length == 0) {
        return []
    }

    return events.map(e => {
        const { content, tags, created_at } = e
        const { amount, description, recipient, transactionId } = JSON.parse(content)

        return {
            date: new Date(created_at * 1000),
            amount,
            description,
            recipient,
            transaction: transactionId,
            paymentId: getTagByMarker(tags, "e", "payment-request"),
        } as Receipt
    })
}

export const getBitcoinPrice = async (settings: Settings, id: string): Promise<{ usdPrice: number, date: Date } | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        '#d': [`bitlasso/btc-price/${id}`]
    });
    if (events.length == 0) {
        return undefined
    }

    const { usdPrice } = JSON.parse(events[0].content)
    return { usdPrice, date: new Date(events[0].created_at * 1000) }
}

const getTag = (tags: string[][], name: string) => tags.find(t => t[0] === name)?.[1]
const getTagByMarker = (tags: string[][], name: string, marker: string) =>
    tags.find(t => t[0] === name && t[3] === marker)?.[1]

export const subscribeRedeem = (id: string, settings: Settings, callback: (redeemAmount: number, redeemTransaction: string) => void) => {
    subscribeAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/redeem/${id}`]
    }, (evt) => {
        const { redeemAmount, redeemTransaction } = JSON.parse(evt.content)
        callback(redeemAmount, redeemTransaction)
    })
}

export const subscribePayment = (requestId: string, settings: Settings, callback: (transaction: string, settlementMode: string) => void) => {
    subscribeAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/payment/${requestId}`]
    }, (evt) => {
        const { settlementMode, transaction } = JSON.parse(evt.content)
        callback(transaction, settlementMode)
    })
}