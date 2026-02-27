import type { NotificationSettings } from "@/components/app/notification-setting";
import { SimplePool, finalizeEvent, getPublicKey } from "nostr-tools"

import { HDKey } from "@scure/bip32";
import { bech32 } from "bech32";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { mnemonicToSeedSync } from "@scure/bip39";

const pool = new SimplePool();
const RELAYS = [
    "wss://relay.damus.io"
    // //   "wss://nos.lol"
    // "wss://localhost:7000"
];

enum EventKind {
    PAYMENT_REQ = 30003,
    RECEIPT_METADATA = 30004,
    NOTIF_SETTING = 30005
}

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

    const nsec = bech32.encode('nsec', bech32.toWords(privateKey)); // Truncate version byte if needed
    const npub = bech32.encode('npub', bech32.toWords(pkBytes));
    return {
        pub: publicKey,
        priv: bytesToHex(privateKey),
        nsec: nsec,
        npub: npub
    }
}

export const registerNotifSettings = async (nostrKeys: NostrKeyPair, notifSettings: NotificationSettings) => {
    const event = {
        kind: EventKind.NOTIF_SETTING,
        content: JSON.stringify(notifSettings),
        pubkey: nostrKeys.pub,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["n", "0"]] // link to notification settings
    }

    const signedEvent = finalizeEvent(event, hexToBytes(nostrKeys.priv));
    await Promise.all(pool.publish(RELAYS, signedEvent))
}

export const getNotifSettings = async (nostrKeys: NostrKeyPair): Promise<NotificationSettings | undefined> => {
    const events = await pool.querySync(RELAYS, {
        kinds: [EventKind.NOTIF_SETTING],
        authors: [nostrKeys.pub],
        "#n": ["0"]
    });
    if (events.length > 0) {
        const { content } = events[0]
        return JSON.parse(content)
    }
    return undefined
}