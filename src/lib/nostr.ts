import type { NotificationSettings } from "@/components/dashboard/notification-setting";
import { SimplePool, getPublicKey, type Filter, type Event } from "nostr-tools"

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

const BACKEND_RELAY = import.meta.env.DEV ? "ws://localhost:3000/nostr" : "wss://api.bitlasso.xyz/nostr"
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

const fetchAndSync = async (filter: Filter) => {
    // Query each relay individually to know which has what
    const results = await Promise.all(
        RELAYS.map(async relay => ({
            relay,
            events: await pool.querySync([relay], filter).catch(() => [] as Event[]),
        }))
    );

    // Collect all unique events across all relays
    const allIds = new Set<string>();
    const merged: Event[] = [];
    for (const { events } of results) {
        for (const e of events) {
            if (!allIds.has(e.id)) {
                allIds.add(e.id);
                merged.push(e);
            }
        }
    }

    if (merged.length === 0) return [];

    // For each relay, push events it's missing
    await Promise.allSettled(
        results.map(({ relay, events }) => {
            const relayIds = new Set(events.map(e => e.id));
            const missing = merged.filter(e => !relayIds.has(e.id));

            if (missing.length === 0) return Promise.resolve();

            console.log(`pushing ${missing.length} missing events to ${relay}`);
            return Promise.allSettled(
                missing.map(e => pool.publish([relay], e))
            );
        })
    );

    return merged;
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

export const registerNotifSettings = async (wallet: Wallet, notifSettings: NotificationSettings) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(notifSettings),
        pubkey: wallet.getNostrPublicKey(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/settings"]],
    }

    const signedEvent = wallet.signNostrEvent(event);
    await pool.publish(RELAYS, signedEvent)
}

export const getNotifSettings = async (wallet: Wallet): Promise<NotificationSettings | undefined> => {
    const events = await fetchAndSync({
        kinds: [30078],
        authors: [wallet.getNostrPublicKey()],
        "#d": ["bitlasso/settings"]
    });
    if (events.length > 0) {
        const { content } = events[0]
        return JSON.parse(content) as NotificationSettings
    }
    return undefined
}

export const fetchPaymentsRequest = async (settings: Settings, wallet: Wallet): Promise<PaymentRequest[]> => {
    const events = await fetchAndSync({
        kinds: [30078],
        "#t": ["bitlasso/req"],
        "#p": [wallet.getNostrPublicKey()]
    });

    if (events.length == 0) return []

    return await Promise.all(events.map(async (e) => {
        const { id, content, created_at } = e
        let paymentRequest = JSON.parse(content) as PaymentRequest
        paymentRequest.id = id
        paymentRequest.createdAt = new Date(created_at * 1000)

        try {
            const paymentDetails = await fetchPaymentDetails(settings, id)
            if (paymentDetails) {
                const { settlementMode, transaction } = paymentDetails
                paymentRequest.settleTx = transaction
                paymentRequest.settlementMode = settlementMode
            }

            const redeemDetails = await fetchRedeemDetails(settings, id)
            if (redeemDetails) {
                paymentRequest.redeemAmount = redeemDetails.redeemAmount
                paymentRequest.redeemTx = redeemDetails.transaction
            }
        }
        catch (e) {
            console.log(e)
        }
        finally {
            return paymentRequest
        }
    }))
}

export const fetchPaymentRequest = async (settings: Settings, id: string): Promise<PaymentRequest> => {
    const events = await fetchAndSync({
        kinds: [30078],
        ids: [id],
        authors: [settings.publicKey]
    });

    if (events.length == 0) {
        throw new Error('Payment not found')
    }

    const { content, created_at } = events[0]
    let paymentRequest = JSON.parse(content) as PaymentRequest
    paymentRequest.id = id
    paymentRequest.createdAt = new Date(created_at * 1000)

    const paymentDetails = await fetchPaymentDetails(settings, id)
    if (paymentDetails) {
        const { settlementMode, transaction } = paymentDetails
        paymentRequest.settleTx = transaction
        paymentRequest.settlementMode = settlementMode
    }

    const redeemDetails = await fetchRedeemDetails(settings, id)
    if (redeemDetails) {
        paymentRequest.redeemAmount = redeemDetails.redeemAmount
        paymentRequest.redeemTx = redeemDetails.transaction
    }

    return paymentRequest
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
    amount: number;
    description: string | undefined;
    btcAddress: string,
    sparkAddress: string,
    lightningInvoice: string,
    settleTx: string | undefined,
    discountRate: number,
    tokenId: string,
    createdAt: Date
    redeemAmount?: number
    redeemTx?: string
    nonce: number
    settlementMode: "spark" | "btc"
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
    await pool.publish(RELAYS, signedEvent)
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

// const getTag = (tags: string[][], name: string) => tags.find(t => t[0] === name)?.[1]
const getTagByMarker = (tags: string[][], name: string, marker: string) =>
    tags.find(t => t[0] === name && t[3] === marker)?.[1]

export const subscribeRedeem = (settings: Settings, id: string, callback: (redeemAmount: number, redeemTransaction: string) => void) => {
    subscribeAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/redeem/${id}`]
    }, (evt) => {
        const { redeemAmount, redeemTransaction } = JSON.parse(evt.content)
        callback(redeemAmount, redeemTransaction)
    })
}

export const subscribePayment = (settings: Settings, requestId: string, callback: (transaction: string, settlementMode: string) => void) => {
    subscribeAndSync({
        kinds: [30078],
        authors: [settings.publicKey],
        "#d": [`bitlasso/payment/${requestId}`]
    }, (evt) => {
        const { settlementMode, transaction } = JSON.parse(evt.content)
        callback(transaction, settlementMode)
    })
}