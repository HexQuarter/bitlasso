import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";

let __wallet: IssuerSparkWallet | undefined
let __walletPromise: Promise<IssuerSparkWallet> | undefined
let __tokenAddress: string | undefined
let __sparkAddress: string | undefined

type TxResult = {
    id: string,
    type: "spark_transfer" | "token_burn" | "token_transfer" | "token_multi_transfer",
    status: "sent" | "confirmed",
    createdAt: string,
    updatedAt: string,
    expiredTime: string,
    from: {
        identifier: string,
        pubkey: string
    } | null,
    to: {
        identifier: string,
        pubkey: string
    } | null,
    amount: number,
    valueUsd: number,
    tokenMetadata?: {
        tokenIdentifier: string,
        tokenAddress: string,
        decimals: number,
        name: string,
        ticker: string,
        issuerPublicKey: string,
        maxSupply: number,
        isFreezable: boolean,
    },
    multiIoDetails?: {
        totalInputAmount: number,
        totalOutputAmount: number,
        inputs: {
            address: string,
            pubkey: string,
            amount: number
        }[]
        outputs: {
            address: string,
            pubkey: string,
            amount: number
        }[]
    },
}

export const checkTransaction = async (txId: string, retries = 0): Promise<TxResult> => {
    const response = await fetch(`https://api.sparkscan.io/v1/tx/${txId}`)
    if (!response.ok) {
        if (response.status == 404) {
            if (retries == 10) {
                throw new Error('TX NOT FOUND')
            }
            await new Promise((r) => setTimeout(r, 1000))
            return await checkTransaction(txId, retries + 1)
        }
        else {
            const { message } = await response.json()
            throw new Error(message)
        }
    }

    const result = await response.json()
    const { status } = result
    if (status != 'confirmed') {
        if (retries == 10) {
            return result
        }
        await new Promise((r) => setTimeout(r, 1000))
        return await checkTransaction(txId, retries + 1)
    }

    return result
}

export const getSparkAddressTransaction = async (expectedAmount: number, address: string): Promise<TxResult | undefined> => {
    const res = await fetch(`https://api.sparkscan.io/v1/address/${address}/transactions`)
    if (!res.ok) {
        return undefined
    }
    const { data } = await res.json()
    if (data.length > 0) {
        const tx = data[0] as TxResult
        if ((tx.amount / 100_000_000) >= expectedAmount) {
            return tx
        }
    }
    return undefined
}

export const getSparkTokenTransfer = async (address: string, tokenId: string, maxReedamableTokens: number): Promise<{ transactionId: string, amount: number } | undefined> => {
    const res = await fetch(`https://api.sparkscan.io/v1/address/${address}/transactions`)
    if (!res.ok) {
        return undefined
    }

    const { data } = await res.json()
    if (data.length == 0) {
        return undefined
    }

    return (data as []).map((txData: any) => {
        if (txData.type == 'token_transfer' && txData.direction == 'incoming' && txData.tokenMetadata.tokenAddress == tokenId) {
            const transferedTokens = txData.tokenAmount / (10 ** txData.tokenMetadata.decimals)
            if (transferedTokens <= maxReedamableTokens) {
                return { transactionId: txData.id, amount: transferedTokens, date: new Date(txData.createdAt) }
            }
        }

        if (txData.type == 'token_multi_transfer' && txData.direction == 'transfer' && txData.tokenMetadata.tokenAddress == tokenId) {
            const { outputs } = txData.multiIoDetails

            const paymentRequestTokenOutput = (outputs as { address: string, amount: string, pubkey: string }[]).find(o => o.address == address)
            if (!paymentRequestTokenOutput) {
                return undefined
            }
            const transferedTokens = Number(paymentRequestTokenOutput.amount) / (10 ** txData.tokenMetadata.decimals)
            if (transferedTokens <= maxReedamableTokens) {
                return { transactionId: txData.id, amount: transferedTokens, date: new Date(txData.createdAt) }
            }
        }

        return undefined
    })
        .filter(x => x !== undefined)
        .sort((a, b) => b!.date.getTime() - a!.date.getTime())
        .at(0)
}


const getFreshWallet = async () => {
    if (__wallet) {
        try {
            // Quick ping to ensure connection is alive
            await __wallet.getSparkAddress()
            return __wallet
        } catch (err: any) {
            console.warn('⚠️ Existing Spark wallet connection failed ping, re-initializing...')
            if (__wallet) {
                try {
                    await __wallet.cleanupConnections()
                } catch (e) { }
            }
            __wallet = undefined
            __walletPromise = undefined
        }
    }

    if (!__walletPromise) {
        __walletPromise = (async () => {
            console.log('🚀 Initializing Spark wallet...')
            const { wallet } = await IssuerSparkWallet.initialize({
                mnemonicOrSeed: process.env['SPARK_MNEMONIC'] as string,
                options: {
                    network: 'MAINNET',
                    optimizationOptions: {
                        auto: false,
                        multiplicity: 1
                    }
                }
            });
            wallet.setPrivacyEnabled(false)
            __wallet = wallet
            console.log('✅ Spark wallet initialized')
            return wallet
        })();
    }
    return __walletPromise
}

const withWallet = async <T>(fn: (wallet: IssuerSparkWallet) => Promise<T>): Promise<T> => {
    try {
        const wallet = await getFreshWallet()
        return await fn(wallet)
    } catch (err: any) {
        const errorMessage = err?.message || '';
        const originalErrorMessage = err?.originalError?.message || '';
        const errorStr = String(err);

        const isConnectionError =
            errorMessage.includes('Channel has been shut down') ||
            originalErrorMessage.includes('Channel has been shut down') ||
            errorStr.includes('Channel has been shut down') ||
            errorMessage.includes('Broken pipe') ||
            originalErrorMessage.includes('Broken pipe') ||
            errorStr.includes('Broken pipe') ||
            errorMessage.includes('Socket closed') ||
            errorStr.includes('Socket closed') ||
            errorMessage.includes('Service Unavailable') ||
            errorMessage.includes('Deadline Exceeded');

        if (isConnectionError) {
            console.warn(`♻️ Spark connection error detected (${errorMessage}). Reinitializing wallet...`)

            // Try to stop the old wallet using the official cleanupConnections method
            if (__wallet) {
                try {
                    await __wallet.cleanupConnections();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }

            __wallet = undefined
            __walletPromise = undefined
            const wallet = await getFreshWallet()

            return await fn(wallet)
        }
        throw err
    }
}

export const getTokenAddress = () => {
    return withWallet(async (wallet) => {
        if (__tokenAddress) return __tokenAddress

        const tokenIdentifiers = await wallet.getIssuerTokenIdentifiers();
        if (tokenIdentifiers.length == 0) {
            const tokenId = await createToken()
            return tokenId
        }
        const tokenId = tokenIdentifiers[0]
        __tokenAddress = tokenId
        return tokenId
    })
}

export const getSparkAddress = async () => {
    return withWallet(async (wallet) => {
        if (__sparkAddress) return __sparkAddress

        const address = await wallet.getSparkAddress()
        __sparkAddress = address
        return address
    })
}

export const getIdentityPublicKey = async () => {
    return withWallet(async (wallet) => {
        return await wallet.getIdentityPublicKey()
    })
}

export const checkLightningInvoiceSettlementTransaction = async (invoiceId: string) => {
    return withWallet(async (wallet) => {
        const request = await wallet.getLightningReceiveRequest(invoiceId);
        if (request?.status == 'TRANSFER_COMPLETED') {
            return request.transfer?.sparkId
        }
        return undefined
    })
}

/**
 * Pings the wallet to ensure the connection is alive.
 * If the channel is shut down, withWallet will trigger re-initialization.
 */
export const syncWallet = async () => {
    return withWallet(async (wallet) => {
        await wallet.getSparkAddress()
    })
}

export const createToken = async () => {
    return withWallet(async (wallet) => {
        const { tokenIdentifier } = await wallet.createToken({
            tokenName: "Bitlasso",
            tokenTicker: "BITL",
            decimals: 1, // Cannot have fraction of token
            isFreezable: false,
            returnIdentifierForCreate: true,
        });

        return tokenIdentifier
    })
}

export const mintAndTransferToken = async (tokenAmount: number, receiverAddress: string) => {
    return withWallet(async (wallet) => {
        // Decimals of the token is 1, so we multiply the amount by 10
        const tokenIdentifier = await getTokenAddress() as Bech32mTokenIdentifier
        await wallet.mintTokens({ tokenIdentifier, tokenAmount: BigInt(tokenAmount * 10) })
        return await wallet.transferTokens({ tokenIdentifier, tokenAmount: BigInt(tokenAmount * 10), receiverSparkAddress: receiverAddress })
    })
}

export const createLightningInvoice = async (idPubKey: string, amountSats: number, description?: string) => {
    return withWallet(async (wallet) => {
        const invoice = await wallet.createLightningInvoice({
            amountSats,
            memo: description,
            receiverIdentityPubkey: idPubKey
        });
        return { invoice: invoice.invoice.encodedInvoice, id: invoice.id }
    })
}

export const createSparkInvoice = async (idPubKey: string, amountSats: number, description?: string) => {
    return withWallet(async (wallet) => {
        const invoice = await wallet.createSatsInvoice({
            amount: amountSats,
            memo: description,
            receiverIdentityPubkey: idPubKey
        });
        return invoice
    })
}

export const createInvoiceFee = async (amountSats: number, memo: string) => {
    return withWallet(async (wallet) => {
        const invoice = await wallet.createLightningInvoice({
            amountSats,
            memo,
            includeSparkInvoice: true,
        });

        const tokenAddress = await getTokenAddress()
        const amount = BigInt(1 * 10)

        const tokenInvoice = await wallet.createTokensInvoice({ amount, tokenIdentifier: tokenAddress as Bech32mTokenIdentifier, memo })

        return {
            lightningInvoice: invoice.invoice,
            tokenInvoice: tokenInvoice
        }
    })
}

export const init = async () => {
    const sparkAddress = await getSparkAddress()
    const tokenAddress = await getTokenAddress()
    __sparkAddress = sparkAddress
    __tokenAddress = tokenAddress

    // Attempt a single optimization run on startup, non-blocking
    optimizeWallet().catch(err => {
        console.warn('⚠️ Initial Spark optimization failed (this is usually fine):', err.message || err);
    });
}

/**
 * Manually trigger leaf optimization to ensure fast transfers.
 */
export const optimizeWallet = async () => {
    return withWallet(async (wallet) => {
        try {
            console.log('🚀 Starting Spark leaf optimization...')
            // optimizeLeaves is an async generator in the SDK
            const generator = wallet.optimizeLeaves(1);
            for await (const _progress of generator) {
                // console.log(`Spark Optimization: ${progress.step}/${progress.total}`)
            }
            console.log('✅ Spark leaf optimization complete')
        } catch (err: any) {
            if (err?.message?.includes('TRANSFER_LOCKED')) {
                console.warn('ℹ️ Spark optimization skipped: Leaves are currently locked by another operation.')
            } else {
                throw err
            }
        }
    })
}

export const shutdown = async () => {
    if (__wallet) {
        console.log('🔌 Cleaning up Spark wallet connections...')
        await __wallet.cleanupConnections()
        __wallet = undefined
    }
}

// type Network = "mainnet" | "testnet" | "signet" | "regtest";

// const HRP_TO_NETWORK: Record<string, Network> = {
//     spark: "mainnet",
//     sp: "mainnet",
//     sparkt: "testnet",
//     spt: "testnet",
//     sparks: "signet",
//     sps: "signet",
//     sparkrt: "regtest",
//     sprt: "regtest",
//     sparkl: "regtest", // local alias
//     spl: "regtest",
// };

// function hrpToNetwork(hrp: string): Network | null {
//     return HRP_TO_NETWORK[hrp.toLowerCase()] ?? null;
// }

// // ─── Minimal protobuf reader ─────────────────────────────────────────────────
// // Handles: varint (0), length-delimited (2), 64-bit (1) skipping

// class ProtoReader {
//     private pos = 0;
//     constructor(private buf: Uint8Array) { }

//     eof() { return this.pos >= this.buf.length; }

//     readVarint(): bigint {
//         let result = 0n, shift = 0n;
//         while (true) {
//             const byte = this.buf[this.pos++];
//             result |= BigInt(byte & 0x7f) << shift;
//             if ((byte & 0x80) === 0) break;
//             shift += 7n;
//         }
//         return result;
//     }

//     readTag(): { fieldNumber: number; wireType: number } {
//         const tag = this.readVarint();
//         return { fieldNumber: Number(tag >> 3n), wireType: Number(tag & 7n) };
//     }

//     readBytes(): Uint8Array {
//         const len = Number(this.readVarint());
//         const slice = this.buf.slice(this.pos, this.pos + len);
//         this.pos += len;
//         return slice;
//     }

//     skip(wireType: number) {
//         switch (wireType) {
//             case 0: this.readVarint(); break;
//             case 1: this.pos += 8; break;
//             case 2: this.readBytes(); break;
//             case 5: this.pos += 4; break;
//             default: throw new Error(`Unknown wire type ${wireType}`);
//         }
//     }

//     sub(bytes: Uint8Array): ProtoReader { return new ProtoReader(bytes); }
// }

// // ─── Proto field numbers (inferred from Go source + proto conventions) ───────
// //
// // SparkAddress:
// //   1: identity_public_key (bytes)
// //   2: spark_invoice_fields (message)
// //   3: signature (bytes)
// //
// // SparkInvoiceFields:
// //   1: version (uint32)
// //   2: id (bytes, 16-byte UUID)
// //   3: sats_payment (oneof, message)  — field 3
// //   4: tokens_payment (oneof, message) — field 4
// //   5: memo (optional string)
// //   6: sender_public_key (bytes)
// //   7: expiry_time (message Timestamp: 1=seconds int64, 2=nanos int32)
// //
// // SatsPayment:
// //   1: amount (optional uint64)
// //
// // TokensPayment:
// //   1: token_identifier (bytes, 32 bytes)
// //   2: amount (bytes, big-endian uint128 ≤ 16 bytes)

// export interface SatsPayment {
//     kind: "sats";
//     amount?: bigint; // satoshis, undefined = 0 / any
// }

// export interface TokensPayment {
//     kind: "tokens";
//     tokenIdentifier: Uint8Array; // 32 bytes
//     amount: Uint8Array;          // big-endian, ≤ 16 bytes
// }

// export interface ParsedSparkInvoice {
//     version: number;
//     id: string;                        // UUID string e.g. "550e8400-..."
//     receiverPublicKey: Uint8Array;     // 33 bytes compressed secp256k1
//     payment: SatsPayment | TokensPayment;
//     memo: string;
//     senderPublicKey: Uint8Array | null; // 33 bytes or null
//     expiryTime: Date | null;
//     signature: Uint8Array | null;
//     network: Network;
// }

// // ─── UUID bytes → string ─────────────────────────────────────────────────────

// function bytesToUUID(b: Uint8Array): string {
//     if (b.length !== 16) throw new Error("UUID must be 16 bytes");
//     const h = Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
//     return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
// }

// // ─── Protobuf parsers ────────────────────────────────────────────────────────

// function parseTimestamp(r: ProtoReader): Date {
//     let seconds = 0n;
//     while (!r.eof()) {
//         const { fieldNumber, wireType } = r.readTag();
//         if (fieldNumber === 1 && wireType === 0) seconds = r.readVarint();
//         else r.skip(wireType);
//     }
//     return new Date(Number(seconds) * 1000);
// }

// function parseSatsPayment(r: ProtoReader): SatsPayment {
//     let amount: bigint | undefined;
//     while (!r.eof()) {
//         const { fieldNumber, wireType } = r.readTag();
//         if (fieldNumber === 1 && wireType === 0) amount = r.readVarint();
//         else r.skip(wireType);
//     }
//     return { kind: "sats", amount };
// }

// function parseTokensPayment(r: ProtoReader): TokensPayment {
//     let tokenIdentifier = new Uint8Array(32);
//     let amount = new Uint8Array(0);
//     while (!r.eof()) {
//         const { fieldNumber, wireType } = r.readTag();
//         if (fieldNumber === 1 && wireType === 2) tokenIdentifier = new Uint8Array(r.readBytes());
//         else if (fieldNumber === 2 && wireType === 2) amount = new Uint8Array(r.readBytes());
//         else r.skip(wireType);
//     }
//     return { kind: "tokens", tokenIdentifier, amount };
// }

// interface RawInvoiceFields {
//     version: number;
//     id: Uint8Array;
//     satsPayment?: Uint8Array;
//     tokensPayment?: Uint8Array;
//     memo?: string;
//     senderPublicKey?: Uint8Array;
//     expiryTime?: Uint8Array;
// }

// function parseSparkInvoiceFields(bytes: Uint8Array): RawInvoiceFields {
//     const r = new ProtoReader(bytes);
//     const f: RawInvoiceFields = { version: 0, id: new Uint8Array(0) };
//     while (!r.eof()) {
//         const { fieldNumber, wireType } = r.readTag();
//         switch (fieldNumber) {
//             case 1: f.version = Number(r.readVarint()); break;
//             case 2: f.id = r.readBytes(); break;
//             case 3: f.satsPayment = r.readBytes(); break;   // oneof sats_payment
//             case 4: f.tokensPayment = r.readBytes(); break; // oneof tokens_payment
//             case 5: f.memo = new TextDecoder().decode(r.readBytes()); break;
//             case 6: f.senderPublicKey = r.readBytes(); break;
//             case 7: f.expiryTime = r.readBytes(); break;
//             default: r.skip(wireType);
//         }
//     }
//     return f;
// }

// interface RawSparkAddress {
//     identityPublicKey: Uint8Array;
//     invoiceFields?: Uint8Array;
//     signature?: Uint8Array;
// }

// function parseSparkAddressProto(bytes: Uint8Array): RawSparkAddress {
//     const r = new ProtoReader(bytes);
//     const a: RawSparkAddress = { identityPublicKey: new Uint8Array(0) };
//     while (!r.eof()) {
//         const { fieldNumber, wireType } = r.readTag();
//         switch (fieldNumber) {
//             case 1: a.identityPublicKey = r.readBytes(); break;
//             case 2: a.invoiceFields = r.readBytes(); break;
//             case 3: a.signature = r.readBytes(); break;
//             default: r.skip(wireType);
//         }
//     }
//     return a;
// }

// // ─── Public API ──────────────────────────────────────────────────────────────

// /**
//  * Decodes a Spark invoice string (bech32m-encoded protobuf SparkAddress)
//  * into a structured ParsedSparkInvoice.
//  *
//  * @example
//  * const invoice = decodeSparkInvoice("spark1...");
//  * console.log(invoice.payment); // { kind: "sats", amount: 1000n }
//  */
// export function decodeSparkInvoice(address: string): ParsedSparkInvoice {
//     const lower = address.toLowerCase();

//     // bech32m has a 1023-char limit by default; Spark uses DecodeNoLimit
//     const decoded = bech32m.decodeUnsafe(lower, lower.length)
//         ?? (() => { throw new Error("Invalid bech32m encoding"); })();

//     const network = hrpToNetwork(decoded.prefix);
//     if (!network) throw new Error(`Unknown network HRP: ${decoded.prefix}`);

//     // Convert 5-bit words → 8-bit bytes (drop the padding byte)
//     const protoBytes = bech32m.fromWords(decoded.words);

//     const raw = parseSparkAddressProto(protoBytes);

//     if (!raw.invoiceFields) {
//         throw new Error("Not a Spark invoice (missing invoice fields) — use decodeSparkAddress for plain addresses");
//     }

//     const fields = parseSparkInvoiceFields(raw.invoiceFields);

//     if (fields.version !== 1) {
//         throw new Error(`Unsupported invoice version: ${fields.version}`);
//     }
//     if (fields.id.length !== 16) {
//         throw new Error("Invoice ID must be 16 bytes (UUID)");
//     }
//     if (!raw.identityPublicKey || raw.identityPublicKey.length === 0) {
//         throw new Error("Missing receiver public key");
//     }

//     // Parse payment type
//     let payment: SatsPayment | TokensPayment;
//     if (fields.satsPayment !== undefined) {
//         payment = parseSatsPayment(new ProtoReader(fields.satsPayment));
//     } else if (fields.tokensPayment !== undefined) {
//         payment = parseTokensPayment(new ProtoReader(fields.tokensPayment));
//     } else {
//         throw new Error("Invoice has no payment type (neither sats nor tokens)");
//     }

//     // Parse optional expiry timestamp
//     let expiryTime: Date | null = null;
//     if (fields.expiryTime) {
//         expiryTime = parseTimestamp(new ProtoReader(fields.expiryTime));
//     }

//     return {
//         version: fields.version,
//         id: bytesToUUID(fields.id),
//         receiverPublicKey: raw.identityPublicKey,
//         payment,
//         memo: fields.memo ?? "",
//         senderPublicKey: fields.senderPublicKey && fields.senderPublicKey.length > 0
//             ? fields.senderPublicKey
//             : null,
//         expiryTime,
//         signature: raw.signature && raw.signature.length > 0 ? raw.signature : null,
//         network,
//     };
// }

// /**
//  * Decodes a plain Spark address (no invoice fields required).
//  * Returns identity public key + network.
//  */
// export function decodeSparkAddress(address: string): {
//     identityPublicKey: Uint8Array;
//     network: Network;
//     invoice: ParsedSparkInvoice | null;
// } {
//     const lower = address.toLowerCase();
//     const decoded = bech32m.decodeUnsafe(lower, lower.length)
//         ?? (() => { throw new Error("Invalid bech32m encoding"); })();

//     const network = hrpToNetwork(decoded.prefix);
//     if (!network) throw new Error(`Unknown network HRP: ${decoded.prefix}`);

//     const protoBytes = bech32m.fromWords(decoded.words);
//     const raw = parseSparkAddressProto(protoBytes);

//     let invoice: ParsedSparkInvoice | null = null;
//     if (raw.invoiceFields) {
//         try { invoice = decodeSparkInvoice(address); } catch { /* plain address */ }
//     }

//     return { identityPublicKey: raw.identityPublicKey, network, invoice };
// }
// const NETWORK_TO_HRP: Record<Network, string> = {
//     mainnet: "spark",
//     testnet: "sparkt",
//     signet: "sparks",
//     regtest: "sparkrt",
// };

// function writeVarint(value: bigint): Uint8Array {
//     const bytes: number[] = [];
//     do {
//         let byte = Number(value & 0x7fn);
//         value >>= 7n;
//         if (value > 0n) byte |= 0x80;
//         bytes.push(byte);
//     } while (value > 0n);
//     return new Uint8Array(bytes);
// }

// function writeField(fieldNumber: number, wireType: number, payload: Uint8Array): Uint8Array {
//     const tag = writeVarint(BigInt((fieldNumber << 3) | wireType));
//     return concat(tag, payload);
// }

// function writeLengthDelimited(fieldNumber: number, bytes: Uint8Array): Uint8Array {
//     const lenPrefix = writeVarint(BigInt(bytes.length));
//     return writeField(fieldNumber, 2, concat(lenPrefix, bytes));
// }

// function concat(...arrays: Uint8Array[]): Uint8Array {
//     const total = arrays.reduce((n, a) => n + a.length, 0);
//     const out = new Uint8Array(total);
//     let offset = 0;
//     for (const a of arrays) { out.set(a, offset); offset += a.length; }
//     return out;
// }

// // ─── Encode SparkAddress proto ────────────────────────────────────────────────
// // SparkAddress { 1: identity_public_key (bytes) }

// function encodeSparkAddressProto(identityPublicKey: Uint8Array): Uint8Array {
//     return writeLengthDelimited(1, identityPublicKey);
// }

// // ─── Public API ───────────────────────────────────────────────────────────────

// /**
//  * Encodes a compressed secp256k1 public key (33 bytes) into a Spark address.
//  *
//  * @example
//  * const address = encodeSparkAddress(pubkeyBytes, "mainnet");
//  * // "spark1..."
//  */
// export function encodeSparkAddress(
//     identityPublicKey: Uint8Array,
//     network: Network = "mainnet",
// ): string {
//     if (identityPublicKey.length !== 33) {
//         throw new Error("Identity public key must be 33 bytes (compressed secp256k1)");
//     }

//     const hrp = NETWORK_TO_HRP[network];
//     const protoBytes = encodeSparkAddressProto(identityPublicKey);
//     const words = bech32m.toWords(protoBytes);

//     return bech32m.encode(hrp, words, protoBytes.length * 2); // generous limit
// }