import { SimplePool, type Filter, type Event, type NostrEvent, nip44, getPublicKey, finalizeEvent, type VerifiedEvent, type EventTemplate } from "nostr-tools"
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { bech32 } from "bech32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { HDKey } from "@scure/bip32";

import type { Wallet } from "./wallet.js";
import type { OrgSettings, SDKConfig, UserSettings, PaymentRequest } from "./types.js";

const pool = new SimplePool({
    enablePing: true,
    enableReconnect: true
});

export class RelayConfig {
    public backendRelay: string
    public backupRelays: string[]

    constructor(config: SDKConfig = {}) {
        this.backendRelay = config.dev ? "ws://localhost:4000/nostr" : "wss://api.bitlasso.xyz/nostr"
        this.backupRelays = [
            'wss://relay.nostrcheck.me',
            'wss://relay.nostriches.club',
            'wss://nos.lol',
            'wss://relay.damus.io',
            'wss://relay.primal.net'
        ]
    }

    get relays(): string[] {
        return [this.backendRelay, ...this.backupRelays]
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

const fetchAndSync = async (relayConfig: RelayConfig, filter: Filter) => {
    console.log('fetching events with filter', filter)
    const backupPromises = relayConfig.backupRelays.map(relay => fetchRelayEvents(relay, filter))
    const primaryResult = await fetchRelayEvents(relayConfig.backendRelay, filter)
    const backupResults = await Promise.all(backupPromises)
    const merged = mergeEvents([primaryResult, ...backupResults])
    await replicateMissing([primaryResult, ...backupResults], merged)
    return merged
}

const subscribeAndSync = (
    relayConfig: RelayConfig,
    filter: Filter,
    onEvent: (event: Event) => void,
): { close: () => void } => {
    // Track which events each relay has seen
    const relaysSeen = new Map<string, Set<string>>(
        relayConfig.relays.map(r => [r, new Set()])
    );

    const deliveredEvents = new Set<string>(); // track delivered events

    const subs = relayConfig.relays.map(relay => {
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
                for (const r of relayConfig.relays) {
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


export const fetchSettings = async (relayConfig: RelayConfig, wallet: Wallet): Promise<UserSettings | undefined> => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
        authors: [wallet.nostrConnection.pubkey],
        "#d": ["bitlasso/settings"]
    });
    if (events.length > 0) {
        const { content } = events[0]
        return JSON.parse(content) as UserSettings
    }
    return undefined
}

export const fetchSettingsByPubkey = async (relayConfig: RelayConfig, pubkey: string): Promise<UserSettings | undefined> => {
    const events = await fetchAndSync(relayConfig, {
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

export const registerOrganizationSettings = async (relayConfig: RelayConfig, wallet: Wallet, orgSettings: OrgSettings) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(orgSettings),
        pubkey: wallet.nostrConnection.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/org_settings"]],
    }

    const signedEvent = await wallet.nostrConnection.sign(event);
    await Promise.any(pool.publish(relayConfig.relays, signedEvent))
    return signedEvent.id
}

export const registerSettings = async (relayConfig: RelayConfig, wallet: Wallet, settings: UserSettings) => {
    const event = {
        kind: 30078,
        content: JSON.stringify(settings),
        pubkey: wallet.nostrConnection.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/settings"]],
    }

    const signedEvent = await wallet.nostrConnection.sign(event);
    await Promise.any(pool.publish(relayConfig.relays, signedEvent))
    return signedEvent.id
}

export const fetchPaymentsRequest = async (relayConfig: RelayConfig, wallet: Wallet): Promise<PaymentRequest[]> => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
        "#t": ["bitlasso/req"],
        "#p": [wallet.nostrConnection.pubkey]
    });

    if (events.length == 0) return []

    const promiseResults = await Promise.allSettled(events.map(e => eventToPaymentRequest(relayConfig, e)))

    return promiseResults
        .filter(p => p.status === 'fulfilled')
        .map(p => p.value)
}

export const fetchPaymentRequest = async (relayConfig: RelayConfig, id: string): Promise<PaymentRequest> => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
        "#d": ["bitlasso/req/" + id]
    });

    if (events.length == 0) {
        throw new Error('Payment not found')
    }

    return eventToPaymentRequest(relayConfig, events[0])
}

const eventToPaymentRequest = async (relayConfig: RelayConfig, event: NostrEvent) => {
    try {
        const { created_at, content } = event
        let paymentRequest = JSON.parse(content) as PaymentRequest
        const pubkey = getTag(event.tags, "p") as string

        const dTag = getTag(event.tags, 'd')
        if (!dTag) {
            throw new Error('Invalid event')
        }
        let id = dTag.split('/').at(-1) as string
        if (!id || id == '') {
            id = event.id
        }

        paymentRequest.id = id
        paymentRequest.pubkey = pubkey
        paymentRequest.createdAt = new Date(created_at * 1000)

        const [paymentDetails, redeemDetails] = await Promise.all([
            fetchPaymentDetails(relayConfig, paymentRequest.id),
            fetchRedeemDetails(relayConfig, paymentRequest.id),
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

        return paymentRequest
    }
    catch (e) {
        throw e
    }
}

const fetchPaymentDetails = async (relayConfig: RelayConfig, requestId: string) => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
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

const fetchRedeemDetails = async (relayConfig: RelayConfig, requestId: string) => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
        "#d": [`bitlasso/redeem/${requestId}`],
    });
    if (events.length == 0) {
        return undefined
    }

    const { redeemAmount, redeemTransaction } = JSON.parse(events[0].content)
    return { redeemAmount, transaction: redeemTransaction }
}

export const getBitcoinPrice = async (relayConfig: RelayConfig, id: string): Promise<{ usdPrice: number, date: Date } | undefined> => {
    try {
        const events = await fetchAndSync(relayConfig, {
            kinds: [30078],
            '#d': [`bitlasso/btc-price/${id}`],
        });
        if (events.length == 0) {
            return undefined
        }

        const { usdPrice } = JSON.parse(events[0].content)
        return { usdPrice, date: new Date(events[0].created_at * 1000) }
    }
    catch (_e) {
        return undefined
    }
}

const getTag = (tags: string[][], name: string) => tags.find(t => t[0] === name)?.[1]
const getTagByMarker = (tags: string[][], name: string, marker: string) =>
    tags.find(t => t[0] === name && t[3] === marker)?.[1]

export const subscribeRedeem = (relayConfig: RelayConfig, id: string, callback: (redeemAmount: number, redeemTransaction: string) => void) => {
    subscribeAndSync(relayConfig, {
        kinds: [30078],
        "#d": [`bitlasso/redeem/${id}`]
    }, (evt) => {
        const { redeemAmount, redeemTransaction } = JSON.parse(evt.content)
        callback(redeemAmount, redeemTransaction)
    })
}

export const subscribePayment = (relayConfig: RelayConfig, requestId: string, callback: (transaction: string, settlementMode: string) => void) => {
    subscribeAndSync(relayConfig, {
        kinds: [30078],
        "#d": [`bitlasso/payment/${requestId}`]
    }, (evt) => {
        const { settlementMode, transaction } = JSON.parse(evt.content)
        callback(transaction, settlementMode)
    })
}

export const fetchEncryptedPassphrase = async (relayConfig: RelayConfig, pubkey: string): Promise<string | undefined> => {
    try {
        const events = await fetchAndSync(relayConfig, {
            kinds: [30078],
            authors: [pubkey],
            "#d": ["bitlasso/recover"]
        });
        if (events.length > 0) {
            const { content } = events[0]
            const data = JSON.parse(content)
            return data.encryptedPassphrase
        }
        return undefined
    } catch (error) {
        console.error('Error fetching encrypted passphrase:', error)
        return undefined
    }
}

export const storeEncryptedPassphrase = async (
    relayConfig: RelayConfig,
    nostrConnection: NostrConnection,
    encryptedPassphrase: string
): Promise<string> => {
    const event = {
        kind: 30078,
        content: JSON.stringify({
            encryptedPassphrase,
            timestamp: Date.now()
        }),
        pubkey: nostrConnection.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "bitlasso/recover"]],
    }

    const signedEvent = await nostrConnection.sign(event);
    await Promise.any(pool.publish(relayConfig.relays, signedEvent))
    return signedEvent.id
}

export type NostrConnection = {
    pubkey: string;
    npub: string;
    sign: (event: EventTemplate) => Promise<VerifiedEvent>;
    getConversationKey: (theirPubkey: string) => Uint8Array;
}

export const isNostrExtensionAvailable = (): boolean => {
    return typeof window !== 'undefined' && !!(window as any).nostr;
}

export const connectViaExtension = async (): Promise<NostrConnection> => {
    const nostr = (window as any).nostr;
    if (!nostr) {
        throw new Error('No Nostr extension found. Please install Alby or nos2x');
    }

    try {
        const pubkey = await nostr.getPublicKey();
        const pkBytes = hexToBytes(pubkey);
        const npub = bech32.encode('npub', bech32.toWords(pkBytes));

        return {
            pubkey,
            npub,
            sign: async (event: EventTemplate) => {
                const signed = await nostr.signEvent(event);
                return signed as VerifiedEvent;
            },
            getConversationKey: (theirPubkey: string) => {
                return nip44.getConversationKey(hexToBytes(pubkey), theirPubkey);
            },
        };
    } catch (error) {
        throw new Error(`Extension connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const decodeNsec = (nsec: string): string => {
    try {
        const decoded = bech32.decode(nsec);
        if (decoded.prefix !== 'nsec') {
            throw new Error('Invalid nsec format');
        }
        const bytes = bech32.fromWords(decoded.words);
        return bytesToHex(new Uint8Array(bytes));
    } catch (error) {
        throw new Error(`Invalid nsec: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const connectViaNsec = (nsecOrHex: string): NostrConnection => {
    let privateKeyHex: string;

    if (nsecOrHex.startsWith('nsec1')) {
        privateKeyHex = decodeNsec(nsecOrHex);
    } else if (/^[a-f0-9]{64}$/i.test(nsecOrHex)) {
        privateKeyHex = nsecOrHex;
    } else {
        throw new Error('Invalid nsec or hex private key');
    }

    const privateKeyBytes = hexToBytes(privateKeyHex);
    const pubkey = getPublicKey(privateKeyBytes);
    const pkBytes = hexToBytes(pubkey);
    const npub = bech32.encode('npub', bech32.toWords(pkBytes));

    return {
        pubkey,
        npub,
        sign: async (event: EventTemplate) => {
            return finalizeEvent(event, privateKeyBytes);
        },
        getConversationKey: (theirPubkey: string) => {
            return nip44.getConversationKey(privateKeyBytes, theirPubkey);
        },
    };
}

export const deriveNsec = (mnemonic: string | Uint8Array): string => {
    let seed: Uint8Array | undefined = undefined
    if (mnemonic instanceof Uint8Array) {
        seed = mnemonic
    }
    else {
        seed = mnemonicToSeedSync(mnemonic)
    }
    const hdkey = HDKey.fromMasterSeed(seed);
    const privateKey = hdkey.derive("m/44'/1237'/0'/0/0").privateKey;
    if (!privateKey) {
        throw new Error('Cannot derive Nostr private key')
    }
    const nsec = bech32.encode('nsec', bech32.toWords(privateKey));
    return nsec
}

export const encryptPassphrase = (passphrase: string, nostrConnection: NostrConnection): string => {
    const conversationKey = nostrConnection.getConversationKey(nostrConnection.pubkey);
    return nip44.encrypt(passphrase, conversationKey);
}

export const decryptPassphrase = (encryptedPassphrase: string, nostrConnection: NostrConnection): string => {
    const conversationKey = nostrConnection.getConversationKey(nostrConnection.pubkey);
    return nip44.decrypt(encryptedPassphrase, conversationKey);
}

export const fetchEarnRequest = async (relayConfig: RelayConfig, requestId: string): Promise<{ sparkAddress: string } | undefined> => {
    const events = await fetchAndSync(relayConfig, {
        kinds: [30078],
        "#d": [`bitlasso/earn/${requestId}`]
    });
    if (events.length == 0) {
        return undefined
    }

    return JSON.parse(events[0].content) as { sparkAddress: string }
}