// import { HDKey } from "@scure/bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

bitcoin.initEccLib(ecc);

export const fetchPrice = async () => {
    const response = await fetch(`https://blockchain.info/ticker`)
    if (!response.ok) {
        throw new Error(`Cannot fetch price`)
    }
    const btcQuotes = await response.json()
    const usdPrices = btcQuotes['USD']

    return { usdPrice: usdPrices['last'] }
}

// export const getBitctoinTransaction = async (expectedAmount: number, address: string): Promise<string | undefined> => {
//     for (const provider of providers) {
//         try {
//             const result = await provider(address)
//             if (result && result.balance >= expectedAmount && result.tx_hash) {
//                 return result.tx_hash
//             }
//             return undefined // balance check passed but not enough — no need to try others
//         } catch (e) {
//             console.log(`${provider} failed to getBitcoinTransaction ${address}`, e)
//             continue // try next provider
//         }
//     }
//     return undefined
// }

// const providers = [
//     async (address: string) => {
//         const res = await fetch(`https://mempool.space/api/address/${address}`)
//         if (!res.ok) {
//             console.log(`mempool.space failed to fetch wallet details for ${address}`)
//             return
//         }
//         const data = await res.json()
//         const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8
//         await new Promise(r => setTimeout(r, 3000))
//         const txRes = await fetch(`https://mempool.space/api/address/${address}/txs`)
//         if (!txRes.ok) {
//             console.log(`mempool.space failed to fetch transactions for the ${address}`)
//             return
//         }
//         const txs = await txRes.json()
//         return { balance, tx_hash: txs[0]?.txid as string, provider: 'mempool' }
//     },
//     async (address: string) => {
//         const res = await fetch(`https://blockstream.info/api/address/${address}`)
//         if (!res.ok) {
//             console.log(`blockstream.info failed to fetch wallet details for ${address}`)
//             return
//         }
//         const data = await res.json()
//         const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8
//         await new Promise(r => setTimeout(r, 3000))
//         const txRes = await fetch(`https://blockstream.info/api/address/${address}/txs`)
//         if (!txRes.ok) {
//             console.log(`blockstream.info failed to fetch transactions for the ${address}`)
//             return
//         }
//         const txs = await txRes.json()
//         return { balance, tx_hash: txs[0]?.txid as string, provider: 'blockstream' }
//     }
// ]

// export class BtcAddressGenerator {
//     private node: HDKey;

//     constructor(xpub: string) {
//         this.node = HDKey.fromExtendedKey(xpub);
//     }

//     /**
//      * Generate receiving address for index i
//      * Matches: m/86'/0'/0'/0/i
//      */
//     getAddress(index: number): string {
//         const child = this.node.deriveChild(index);

//         if (!child.publicKey) {
//             throw new Error("No public key derived");
//         }

//         // ✅ convert compressed pubkey → x-only pubkey
//         const xOnlyPubkey = child.publicKey.slice(1);

//         return bitcoin.payments.p2tr({
//             pubkey: xOnlyPubkey,
//             network: bitcoin.networks.bitcoin,
//         }).address!;
//     }
// }