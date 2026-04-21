import { defaultConfig, SdkBuilder, type BreezSdk, type DepositInfo, type Payment, type PrepareLnurlPayResponse, type PrepareSendPaymentResponse, type SdkEvent, type Seed } from "@breeztech/breez-sdk-spark/web";
import { SparkWallet } from "@buildonspark/spark-sdk";
import { getNostrKeyPair, type NostrKeyPair } from "./nostr";
import { uint8ArrayToNum } from "./utils";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { finalizeEvent, nip44, type EventTemplate, type VerifiedEvent } from "nostr-tools";
export const BURN_PUBLIC_KEY =
    "020202020202020202020202020202020202020202020202020202020202020202";

export type TokenMetadata = {
    identifier: string;
    name: string;
    symbol: string;
    maxSupply: bigint;
    decimals: number;
};

export type TokenBalanceMap = Map<string, {
    balance: bigint;
    tokenMetadata: TokenMetadata;
}>;

export type TokenStats = {
    burns: number
    mints: number
    transfers: number
    circulating: number
}

export type Balance = {
    balance: bigint;
    tokenBalances: TokenBalanceMap;
}

export type SparkPayment = {
    id: string
    amount: bigint
    timestamp: number
    direction: SparkPaymentDirection
    method: "lightning" | "spark" | "token" | "deposit" | "withdraw"
}

export type PriceRate = {
    currency: string
    value: number
}

export type SparkPaymentDirection = "INCOMING" | "OUTGOING"

type EventMap = Record<string, any>;
export class TypedEventEmitter<Events extends EventMap> {
    private events = new Map<keyof Events, Array<Events[keyof Events]>>();

    on<K extends keyof Events>(event: K, listener: Events[K]): this {
        const listeners = this.events.get(event) || [];
        listeners.push(listener);
        this.events.set(event, listeners);
        return this;
    }

    emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach((listener) => listener(...args));
            return true;
        }
        return false;
    }
}

interface _SparkWallet {
    getSparkAddress: () => Promise<string>;
    getBitcoinAddress: () => Promise<string>;
    getLightningAddress: () => Promise<string>;
    createLightningInvoice: (amountSats?: number, description?: string) => Promise<{ invoice: string }>;
    mintTokens: (amount: bigint) => Promise<{ id: string, timestamp: Date }>;
    burnTokens: (amount: bigint, tokenIdentifier?: string) => Promise<{ id: string, timestamp: Date }>;
    getTokenMetadata: (identifier?: string) => Promise<TokenMetadata | undefined>;
    getTokenStats: (tokenMetadata: TokenMetadata) => Promise<undefined | TokenStats>;
    createToken: (name: string, symbol: string, initialSupply: bigint, decimals: number, isFreezable: boolean) => Promise<{ tokenId: string }>;
    getBalance: (forcedSync?: boolean) => Promise<Balance>;
    sendSparkPayment(address: string, amountSats?: number): Promise<{ paymentId: string }>;
    sendLightningPayment(invoice: string, amountSats?: number): Promise<{ paymentId: string }>;
    sendOnChainPayment(address: string, amountSats: number): Promise<{ paymentId: string }>;
    sendTokenTransfer(tokenIdentifier: string, amount: bigint, recipient: string): Promise<{ paymentId: string }>;
    getTransferFee(type: 'spark' | 'bitcoin' | 'token' | "lightning", address: string, amountSats?: number, tokenIdentifier?: string): Promise<number>;
    createSparkAddress(id: number): Promise<string>
    createBitcoinAddress(id: number): Promise<string>
    withAccountNumber(nonce: number): Promise<Wallet>
    listPayments(): Promise<SparkPayment[]>
    listUnclaimDeposits(): Promise<Deposit[]>
    claimDeposit(txId: string, vout: number): Promise<void>
    fetchPrices(): Promise<PriceRate[]>
    on<K extends keyof BreezEvent>(eventName: K, callback: BreezEvent[K]): void
    validAddress(string: string, method?: 'spark' | 'lightning' | 'bitcoin'): Promise<boolean>
    signMessage(message: string): Promise<{ signature: string, pubkey: string }>
    disconnect(): Promise<void>
    ecdhNostrKey(pubKey: string): Uint8Array | undefined
}

interface NostrWallet {
    getNostrPublicKey(): string
    signNostrEvent(event: EventTemplate): VerifiedEvent
}

export type Wallet = _SparkWallet & NostrWallet

export type Deposit = {
    txid: string;
    vout: number;
}

interface BreezEvent {
    synced: () => void;
    unclaimedDeposits: (unclaimedDeposits: DepositInfo[]) => void;
    claimedDeposits: (claimedDeposits: DepositInfo[]) => void;
    paymentReceived: (payment: Payment) => void
    paymentSent: (payment: Payment) => void
    paymentPending: (payment: Payment) => void
    paymentFailed: (payment: Payment) => void
}

export class BreezSparkWallet extends TypedEventEmitter<BreezEvent> implements Wallet {
    private sdk: BreezSdk;
    private sparkWallet: SparkWallet;
    private builderNewFn: () => Promise<SdkBuilder>;
    private builderSparkWalletFn: (accountNumber: number) => Promise<SparkWallet>
    private nostrKeypair: NostrKeyPair | undefined;

    constructor(builderNewFn: () => Promise<SdkBuilder>, builderSparkWalletFn: (accountNumber: number) => Promise<SparkWallet>, sdk: BreezSdk, sparkWallet: SparkWallet) {
        super()
        this.builderNewFn = builderNewFn;
        this.builderSparkWalletFn = builderSparkWalletFn
        this.sdk = sdk;
        this.sparkWallet = sparkWallet
    }

    async withAccountNumber(nonce: number): Promise<BreezSparkWallet> {
        let builder = await this.builderNewFn()
        builder = builder.withKeySet({
            keySetType: 'default',
            useAddressIndex: false,
            accountNumber: nonce
        })
        const sdk = await builder.build()
        const sparkWallet = await this.builderSparkWalletFn(nonce)

        return new BreezSparkWallet(this.builderNewFn, this.builderSparkWalletFn, sdk, sparkWallet)
    }

    static async initialize(mnemonic: string, apiKey: string): Promise<BreezSparkWallet> {
        const seed: Seed = { type: 'mnemonic', mnemonic: mnemonic, passphrase: undefined }
        const config = defaultConfig('mainnet')
        config.apiKey = apiKey
        config.maxDepositClaimFee = { type: 'rate', satPerVbyte: 10 }

        let builder = SdkBuilder.new(config, seed)
        builder = await builder.withDefaultStorage('./bitlasso')
        builder = builder.withKeySet({
            keySetType: 'default',
            useAddressIndex: false,
            accountNumber: 1
        })
        const sdk = await builder.build()
        await sdk.updateUserSettings({
            sparkPrivateModeEnabled: false
        })

        const buildSparkWalletFn = async (accountNumber: number) => {
            const { wallet } = await SparkWallet.initialize({ mnemonicOrSeed: mnemonic, accountNumber: accountNumber, options: { network: "MAINNET" } })
            return wallet
        }

        const sparkWallet = await buildSparkWalletFn(1)

        const instance = new BreezSparkWallet(async () => {
            let builder = SdkBuilder.new(config, seed)
            builder = await builder.withDefaultStorage('./bitlasso')
            return builder
        }, buildSparkWalletFn, sdk, sparkWallet)

        class JsEventListener {
            private deliveredEvents = new Set<string>(); // track delivered events

            onEvent = async (event: SdkEvent) => {
                console.log(event)
                switch (event.type) {
                    case 'synced': {
                        // Data has been synchronized with the network. When this event is received,
                        // it is recommended to refresh the payment list and wallet balance.
                        instance.emit('synced')
                        break
                    }
                    case 'unclaimedDeposits': {
                        // SDK was unable to claim some deposits automatically
                        const unclaimedDeposits = event.unclaimedDeposits
                        instance.emit('unclaimedDeposits', unclaimedDeposits)
                        break
                    }
                    case 'claimedDeposits': {
                        // Deposits were successfully claimed
                        const claimedDeposits = event.claimedDeposits
                        instance.emit('claimedDeposits', claimedDeposits)
                        break
                    }
                    case 'paymentSucceeded': {
                        // A payment completed successfully
                        const payment = event.payment
                        if (this.deliveredEvents.has(`${payment.paymentType}:${payment.id}`)) return

                        if (payment.paymentType == 'receive') {
                            instance.emit('paymentReceived', payment)
                        }
                        else {
                            instance.emit('paymentSent', payment)
                        }
                        this.deliveredEvents.add(`${payment.paymentType}:${payment.id}`)
                        break
                    }
                    case 'paymentPending': {
                        // A payment is pending (waiting for confirmation)
                        const pendingPayment = event.payment
                        if (this.deliveredEvents.has(`pending:${pendingPayment.id}`)) return

                        instance.emit('paymentPending', pendingPayment)
                        this.deliveredEvents.add(`pending:${pendingPayment.id}`)
                        break
                    }
                    case 'paymentFailed': {
                        // A payment failed
                        const failedPayment = event.payment
                        if (this.deliveredEvents.has(`failed:${failedPayment.id}`)) return

                        instance.emit('paymentFailed', failedPayment)
                        this.deliveredEvents.add(`failed:${failedPayment.id}`)
                        break
                    }
                    default: {
                        // Handle any future event types
                        break
                    }
                }
            }
        }

        await sdk.addEventListener(new JsEventListener())

        try {
            const unclaimedDeposits = await sdk.listUnclaimedDeposits({})
            if (unclaimedDeposits.deposits.length > 0) {
                const promises = unclaimedDeposits.deposits.map(d => {
                    return sdk.claimDeposit({ txid: d.txid, vout: d.vout })
                })
                await Promise.all(promises)
            }
        }
        catch (e) {
            console.error('cannot claim deposit')
        }

        instance.nostrKeypair = getNostrKeyPair(mnemonic)

        return instance;
    }

    async getBalance(forcedSync = false): Promise<Balance> {
        const info = await this.sdk.getInfo({
            // ensureSynced: true will ensure the SDK is synced with the Spark network
            // before returning the balance
            ensureSynced: forcedSync
        })

        const tokenBalances = new Map() as TokenBalanceMap
        info.tokenBalances.forEach(async (tb, id) => {
            tokenBalances.set(id, {
                balance: BigInt(tb.balance),
                tokenMetadata: {
                    identifier: id,
                    name: tb.tokenMetadata.name,
                    symbol: tb.tokenMetadata.ticker,
                    maxSupply: BigInt(tb.tokenMetadata.maxSupply),
                    decimals: tb.tokenMetadata.decimals
                }
            })
        })

        return {
            balance: BigInt(info.balanceSats),
            tokenBalances: tokenBalances
        }
    }

    async getBitcoinAddress(): Promise<string> {
        const response = await this.sdk.receivePayment({
            paymentMethod: { type: 'bitcoinAddress' }
        })
        const paymentRequest = response.paymentRequest
        return paymentRequest
    }

    async getSparkAddress(): Promise<string> {
        const response = await this.sdk.receivePayment({
            paymentMethod: { type: 'sparkAddress' }
        })
        const paymentRequest = response.paymentRequest
        return paymentRequest
    }

    async getLightningAddress(): Promise<string> {
        const nostrPubKey = await this.getNostrPublicKey()
        const isAvailable = await this.sdk.checkLightningAddressAvailable({
            username: nostrPubKey
        })
        if (isAvailable) {
            const info = await this.sdk.registerLightningAddress({ username: nostrPubKey })
            return info.lightningAddress
        }
        else {
            const info = await this.sdk.getLightningAddress()
            if (info) {
                return info.lightningAddress
            }
            throw new Error('Cannot retrieve lightning address')
        }
    }

    async createLightningInvoice(amountSats?: number, description?: string): Promise<{ invoice: string, feeSats: bigint }> {
        // Using the SparkWallet with receiverIdentityPubkey allows the backend to be notified once a Lightning payment is done
        const pubKey = await this.sparkWallet.getIdentityPublicKey()
        const invoice = await this.sparkWallet.createLightningInvoice({
            amountSats: amountSats || 0,
            memo: description,
            receiverIdentityPubkey: pubKey
        })
        return { invoice: invoice.invoice.encodedInvoice, feeSats: 0n }
    }

    async mintTokens(amount: bigint): Promise<{ id: string, timestamp: Date }> {
        const tokenIssuer = this.sdk.getTokenIssuer()
        const payment = await tokenIssuer.mintIssuerToken({ amount })
        const paymentDetails = payment.details as { type: 'token'; txHash: string };
        return { id: paymentDetails.txHash, timestamp: new Date(payment.timestamp * 1000) };
    }

    async burnTokens(amount: bigint, tokenIdentifier?: string): Promise<{ id: string, timestamp: Date }> {
        if (tokenIdentifier) {
            // Burn address
            const { paymentId } = await this.sendTokenTransfer(tokenIdentifier, amount, 'spark1pgssyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszykl0d2')
            return { id: paymentId, timestamp: new Date() }
        }
        const tokenIssuer = this.sdk.getTokenIssuer()
        const payment = await tokenIssuer.burnIssuerToken({ amount })
        return { id: payment.id, timestamp: new Date(payment.timestamp * 1000) };
    }

    async getTokenMetadata(identifier?: string): Promise<TokenMetadata | undefined> {
        if (identifier) {
            const res = await this.sdk.getTokensMetadata({
                tokenIdentifiers: [identifier]
            })
            if (res.tokensMetadata.length > 0) {
                return {
                    identifier: identifier,
                    name: res.tokensMetadata[0].name,
                    symbol: res.tokensMetadata[0].name,
                    maxSupply: BigInt(res.tokensMetadata[0].maxSupply),
                    decimals: res.tokensMetadata[0].decimals,
                }
            }
            return undefined
        }

        const tokenIssuer = this.sdk.getTokenIssuer()
        const metadata = await tokenIssuer.getIssuerTokenMetadata()
        return {
            identifier: metadata.identifier,
            name: metadata.name,
            symbol: metadata.ticker,
            maxSupply: BigInt(metadata.maxSupply),
            decimals: metadata.decimals
        }
    }

    async getTokenStats(tokenMetadata: TokenMetadata): Promise<undefined | TokenStats> {
        try {
            const all = [];

            let cursor: string | undefined;

            do {
                const page = await this.sparkWallet.queryTokenTransactionsWithFilters({
                    tokenIdentifiers: [tokenMetadata.identifier],
                    pageSize: 50,
                    cursor,
                    direction: "NEXT",
                });

                all.push(...page.tokenTransactionsWithStatus);
                cursor = page.pageResponse?.nextCursor;
            } while (cursor);

            const res = all.reduce((acc, t) => {
                if (t.tokenTransaction?.tokenInputs?.$case == 'mintInput') {
                    const amount = uint8ArrayToNum(t.tokenTransaction.tokenOutputs[0].tokenAmount)
                    acc.mint += Number(amount) / (10 ** tokenMetadata.decimals)
                }
                if (t.tokenTransaction?.tokenInputs?.$case == 'transferInput') {
                    const amount = uint8ArrayToNum(t.tokenTransaction.tokenOutputs[0].tokenAmount)
                    if (bytesToHex(t.tokenTransaction.tokenOutputs[0].ownerPublicKey) == BURN_PUBLIC_KEY) {
                        acc.burn += Number(amount) / (10 ** tokenMetadata.decimals)
                    }
                    acc.transfers += Number(amount) / (10 ** tokenMetadata.decimals)
                }
                return acc
            }, { burn: 0, mint: 0, transfers: 0 } as { burn: number, mint: number, transfers: number })

            return {
                burns: res.burn,
                mints: res.mint,
                transfers: res.transfers,
                circulating: res.mint - res.burn
            }
        }
        catch (e) {
            console.log(e)
            return undefined
        }
    }

    async createToken(name: string, symbol: string, initialSupply: bigint, decimals: number = 1, isFreezable: boolean = false): Promise<{ tokenId: string; }> {
        const tokenIssuer = this.sdk.getTokenIssuer()
        const response = await tokenIssuer.createIssuerToken({
            name: name,
            ticker: symbol,
            decimals: decimals,
            isFreezable: isFreezable,
            maxSupply: initialSupply
        })

        return { tokenId: response.identifier };
    }

    async getTokenBalance(): Promise<bigint> {
        try {
            const tokenIssuer = this.sdk.getTokenIssuer()
            const balance = (await tokenIssuer.getIssuerTokenBalance()).balance
            return balance
        }
        catch (error) {
            console.log("Error fetching token balance:", error);
            return BigInt(0)
        }
    }

    async fetchPrices(): Promise<PriceRate[]> {
        const response = await this.sdk.listFiatRates()
        return response.rates.map(v => {
            return {
                currency: v.coin,
                value: v.value
            } as PriceRate
        })
    }

    async sendSparkPayment(address: string, amountSats: number): Promise<{ paymentId: string }> {
        const prepareResponse = await this.sdk.prepareSendPayment({
            paymentRequest: address,
            amount: BigInt(amountSats)
        })

        const sendResponse = await this.sdk.sendPayment({
            prepareResponse
        })

        const payment = sendResponse.payment
        return { paymentId: payment.id };
    }

    async sendTokenTransfer(tokenIdentifier: string, amount: bigint, recipient: string): Promise<{ paymentId: string }> {
        const prepareResponse = await this.sdk.prepareSendPayment({
            paymentRequest: recipient,
            amount: BigInt(amount),
            tokenIdentifier
        })

        const sendResponse = await this.sdk.sendPayment({
            prepareResponse
        })
        const payment = sendResponse.payment
        if (payment.details?.type != 'token') {
            throw new Error('Expected token transfer')
        }
        return { paymentId: payment.details.txHash };
    }

    async sendOnChainPayment(address: string, amountSats: number): Promise<{ paymentId: string }> {
        const prepareResponse = await this.sdk.prepareSendPayment({
            paymentRequest: address,
            amount: BigInt(amountSats)
        })

        const sendResponse = await this.sdk.sendPayment({
            prepareResponse,
            options: {
                type: 'bitcoinAddress',
                confirmationSpeed: 'medium'
            },
        })
        const payment = sendResponse.payment
        return { paymentId: payment.id }
    }

    async sendLightningPayment(invoice: string, amountSats?: number): Promise<{ paymentId: string }> {
        const response = await this.prepareLightningPayment(invoice, amountSats)
        if ('payRequest' in response) {
            const res = await this.sdk.lnurlPay({
                prepareResponse: response as PrepareLnurlPayResponse
            })
            return { paymentId: res.payment.id };
        } else {
            const res = await this.sdk.sendPayment({
                prepareResponse: response as PrepareSendPaymentResponse
            })
            return { paymentId: res.payment.id };
        }
    }

    async getTransferFee(type: 'spark' | 'bitcoin' | 'token' | "lightning", addressOrInvoice: string, amountSats?: number, tokenIdentifier?: string): Promise<number> {
        switch (type) {
            case 'spark': {
                const prepareResponse = await this.sdk.prepareSendPayment({
                    paymentRequest: addressOrInvoice,
                    amount: amountSats ? BigInt(amountSats) : undefined
                })

                if (prepareResponse.paymentMethod.type == 'sparkAddress') {
                    return Number(prepareResponse.paymentMethod.fee);
                }

                return 0;
            }
            case 'bitcoin': {
                const prepareResponse = await this.sdk.prepareSendPayment({
                    paymentRequest: addressOrInvoice,
                    amount: amountSats ? BigInt(amountSats) : undefined
                })

                if (prepareResponse.paymentMethod.type == 'bitcoinAddress') {
                    const feeQuote = prepareResponse.paymentMethod.feeQuote.speedMedium;
                    return feeQuote.userFeeSat + feeQuote.l1BroadcastFeeSat;
                }

                return 0;
            }
            case 'token': {
                const prepareResponse = await this.sdk.prepareSendPayment({
                    paymentRequest: addressOrInvoice,
                    amount: amountSats ? BigInt(amountSats) : undefined,
                    tokenIdentifier: tokenIdentifier
                })

                if (prepareResponse.paymentMethod.type == 'sparkAddress') {
                    return Number(prepareResponse.paymentMethod.fee);
                }

                return 0;
            }
            case 'lightning': {
                const prepareResponse = await this.prepareLightningPayment(addressOrInvoice, amountSats)
                if ('payRequest' in prepareResponse) {
                    return prepareResponse.feeSats;
                }
                else if (prepareResponse.paymentMethod.type == 'bolt11Invoice') {
                    const lnFees = prepareResponse.paymentMethod.lightningFeeSats;
                    if (prepareResponse.paymentMethod.sparkTransferFeeSats) {
                        return lnFees + prepareResponse.paymentMethod.sparkTransferFeeSats;
                    }
                    return lnFees;
                }
                return 0;
            }
            default:
                return 0;
        }
    }

    private async prepareLightningPayment(invoice: string, amountSats?: number): Promise<PrepareSendPaymentResponse | PrepareLnurlPayResponse> {
        const parsedInvoice = await this.sdk.parse(invoice)
        switch (parsedInvoice.type) {
            case 'bolt11Invoice':
                if (parsedInvoice.amountMsat === undefined && amountSats === undefined) {
                    throw new Error('Amount must be specified for invoices without an amount')
                }

                const prepareResponse = await this.sdk.prepareSendPayment({
                    paymentRequest: invoice,
                    amount: amountSats ? BigInt(amountSats) : undefined
                })

                return prepareResponse
            case 'bolt12Invoice':
                const prepareBolt12Response = await this.sdk.prepareSendPayment({
                    paymentRequest: invoice,
                    amount: amountSats ? BigInt(amountSats) : undefined
                })
                return prepareBolt12Response
            case 'lightningAddress':
                if (amountSats === undefined) {
                    throw new Error('Amount must be specified for Lightning Address payments')
                }

                if (parsedInvoice.payRequest.minSendable !== undefined && amountSats < parsedInvoice.payRequest.minSendable) {
                    throw new Error(`Amount is below the minimum amount of ${parsedInvoice.payRequest.minSendable} sats`)
                }
                if (parsedInvoice.payRequest.maxSendable !== undefined && amountSats > parsedInvoice.payRequest.maxSendable) {
                    throw new Error(`Amount is above the maximum amount of ${parsedInvoice.payRequest.maxSendable} sats`)
                }

                const prepareResponseLnAddress = await this.sdk.prepareLnurlPay({
                    amount: BigInt(amountSats),
                    payRequest: parsedInvoice.payRequest
                })

                return prepareResponseLnAddress
            case 'lnurlPay':
                // LNURL pay requests may have a min and max amount, but we still require an amount to be specified
                if (amountSats === undefined) {
                    throw new Error('Amount must be specified for LNURL pay requests')
                }

                if (parsedInvoice.minSendable !== undefined && amountSats < parsedInvoice.minSendable) {
                    throw new Error(`Amount is below the minimum amount of ${parsedInvoice.minSendable} sats`)
                }
                if (parsedInvoice.maxSendable !== undefined && amountSats > parsedInvoice.maxSendable) {
                    throw new Error(`Amount is above the maximum amount of ${parsedInvoice.maxSendable} sats`)
                }

                const prepareResponseLnPay = await this.sdk.prepareLnurlPay({
                    amount: BigInt(amountSats),
                    payRequest: parsedInvoice
                })

                return prepareResponseLnPay
            default:
                throw new Error('Unsupported invoice type')
        }
    }

    async createSparkAddress(id: number): Promise<string> {
        let builder = await this.builderNewFn()
        builder = builder.withKeySet({
            keySetType: 'default',
            useAddressIndex: false,
            accountNumber: id
        })
        const sdk = await builder.build()
        await sdk.updateUserSettings({
            sparkPrivateModeEnabled: false
        })
        const response = await sdk.receivePayment({
            paymentMethod: { type: 'sparkAddress' }
        })
        await sdk.disconnect()
        return response.paymentRequest
    }

    async createBitcoinAddress(id: number): Promise<string> {
        let builder = await this.builderNewFn()
        builder = builder.withKeySet({
            keySetType: 'default',
            useAddressIndex: false,
            accountNumber: id
        })
        const sdk = await builder.build()
        const response = await sdk.receivePayment({
            paymentMethod: { type: 'bitcoinAddress' }
        })
        await sdk.disconnect()
        return response.paymentRequest
    }

    async listPayments(): Promise<SparkPayment[]> {
        const response = await this.sdk.listPayments({})
        return response.payments.map(p => {
            return {
                id: p.id,
                amount: p.amount,
                timestamp: p.timestamp,
                method: p.method as "lightning" | "spark" | "token" | "deposit" | "withdraw",
                direction: p.paymentType == 'send' ? 'OUTGOING' : 'INCOMING'
            }
        })
    }

    async listUnclaimDeposits(): Promise<Deposit[]> {
        const unclaimDeposits = await this.sdk.listUnclaimedDeposits({})
        return unclaimDeposits.deposits as Deposit[]
    }

    async claimDeposit(txId: string, vout: number): Promise<void> {
        await this.sdk.claimDeposit({ txid: txId, vout })
    }

    async validAddress(address: string, method?: 'spark' | 'lightning' | 'bitcoin'): Promise<boolean> {
        const parsed = await this.sdk.parse(address)
        switch (method) {
            case 'bitcoin':
                return parsed.type == 'bitcoinAddress'
            case 'spark':
                return parsed.type == 'sparkAddress'
            case 'lightning':
                return parsed.type == 'bolt11Invoice' || parsed.type == 'bolt12Invoice' || parsed.type == 'lnurlPay' || parsed.type == 'lightningAddress'
            default:
                return false
        }
    }

    getNostrPublicKey(): string {
        if (!this.nostrKeypair) {
            throw new Error("Nost wallet undefined")
        }
        return this.nostrKeypair.pub
    }

    signNostrEvent(event: EventTemplate): VerifiedEvent {
        if (!this.nostrKeypair) {
            throw new Error("Nost wallet undefined")
        }
        return finalizeEvent(event, hexToBytes(this.nostrKeypair.priv))
    }

    ecdhNostrKey(pubKey: string): Uint8Array | undefined {
        if (!this.nostrKeypair) return undefined
        return nip44.getConversationKey(hexToBytes(this.nostrKeypair?.pub), pubKey)
    }

    async signMessage(message: string): Promise<{ signature: string, pubkey: string }> {
        const signMessageResponse = await this.sdk.signMessage({
            message,
            compact: true
        })

        return signMessageResponse
    }

    async disconnect(): Promise<void> {
        await this.sdk.disconnect()
    }

}