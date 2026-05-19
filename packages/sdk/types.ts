/**
 * Type definitions for the BitLasso SDK
 */

import type { DepositInfo, Seed, Payment as BreezPayment } from "@breeztech/breez-sdk-spark/web";
import type { NostrConnection, RelayConfig } from "./nostr.js";

/**
 * Configuration options for the SDK
 */
export interface SDKConfig {
    /** API base URL. Defaults to production API if not provided */
    apiUrl?: string;
    /** Whether to use development mode (localhost API) */
    dev?: boolean;
}

/**
 * Bundle information for purchasing credits
 */
export interface Bundle {
    id: string;
    name: string;
    pricePerEach: number;
    quantity: number;
    savings: number
}

/**
 * Payment item in a payment request
 */
export interface PaymentItem {
    title: string;
    description: string;
    amount: number;
}

/**
 * Payment request data
 */
export interface PaymentRequestPayload {
    items: PaymentItem[];
    discountRate: number;
}

/**
 * Settings returned from the API
 */
export interface Settings {
    tokenAddress: string;
    bundles: Bundle[];
    address: string;
    npub: string;
    publicKey: string;
}

/**
 * Status information
 */
export interface Status {
    sparkStatus: string;
}

/**
 * Payment price information
 */
export interface PaymentPrice {
    btc: number;
    endtime: number;
    lightningInvoice?: string;
}

/**
 * Purchase credits response
 */
export interface PurchaseCreditsResponse {
    transferId: string;
}

/**
 * Publish payment request response
 */
export interface PublishPaymentRequestResponse {
    id: string;
    paymentRequestId: string;
    status: string;
    createdAt: string;
    expiresAt?: string;
}

/**
 * Token metadata information
 */
export interface TokenMetadata {
    identifier: string;
    name: string;
    symbol: string;
    maxSupply: bigint;
    decimals: number;
}

/**
 * Token balance information
 */
export interface TokenBalance {
    balance: bigint;
    tokenMetadata: TokenMetadata;
}

/**
 * Token balance map
 */
export type TokenBalanceMap = Map<string, TokenBalance>;

/**
 * Token statistics
 */
export interface TokenStats {
    burns: number;
    mints: number;
    transfers: number;
    circulating: number;
}

/**
 * Balance information
 */
export interface Balance {
    balance: bigint;
    tokenBalances: TokenBalanceMap;
}

/**
 * Spark payment information
 */
export interface SparkPayment {
    id: string;
    amount: bigint;
    timestamp: number;
    direction: 'INCOMING' | 'OUTGOING';
    method: 'lightning' | 'spark' | 'token' | 'deposit' | 'withdraw';
}

/**
 * Price rate information
 */
export interface PriceRate {
    currency: string;
    value: number;
}

/**
 * Deposit information
 */
export interface Deposit {
    txid: string;
    vout: number;
}

/**
 * Payment details for different payment types
 */
export interface LightningPaymentDetails {
    type: 'lightning';
    htlcDetails: {
        preimage: string;
    };
}

export interface TokenPaymentDetails {
    type: 'token';
    txHash: string;
}

export type PaymentDetails = LightningPaymentDetails | TokenPaymentDetails;

export interface BreezEvent {
    synced: () => void;
    unclaimedDeposits: (unclaimedDeposits: DepositInfo[]) => void;
    claimedDeposits: (claimedDeposits: DepositInfo[]) => void;
    paymentReceived: (payment: BreezPayment) => void
    paymentSent: (payment: BreezPayment) => void
    paymentPending: (payment: BreezPayment) => void
    paymentFailed: (payment: BreezPayment) => void
}

/**
 * Wallet interface for SDK operations
 */
export interface WalletOperations {
    getSparkAddress(): Promise<string>;
    getBitcoinAddress(): Promise<string>;
    getLightningAddress(): Promise<string>;
    mintTokens(amount: bigint): Promise<{ id: string; timestamp: Date }>;
    burnTokens(amount: bigint, tokenIdentifier?: string): Promise<{ id: string; timestamp: Date }>;
    getTokenMetadata(identifier?: string): Promise<TokenMetadata | undefined>;
    getTokenStats(tokenMetadata: TokenMetadata): Promise<TokenStats | undefined>;
    createToken(name: string, symbol: string, initialSupply: bigint, decimals: number, isFreezable: boolean): Promise<{ tokenId: string }>;
    getBalance(): Promise<Balance>;
    sendSparkPayment(address: string, amountSats?: number): Promise<{ paymentId: string }>;
    sendLightningPayment(invoice: string, amountSats?: number): Promise<{ paymentId: string }>;
    sendOnChainPayment(address: string, amountSats: number): Promise<{ paymentId: string }>;
    sendTokenTransfer(tokenIdentifier: string, amount: bigint, recipient: string): Promise<{ paymentId: string }>;
    getTransferFee(type: 'spark' | 'bitcoin' | 'token' | 'lightning', address: string, amountSats?: number, tokenIdentifier?: string): Promise<number>;
    listPayments(): Promise<SparkPayment[]>;
    listUnclaimDeposits(): Promise<Deposit[]>;
    claimDeposit(txId: string, vout: number): Promise<void>;
    fetchPrices(): Promise<PriceRate[]>;
    disconnect(): Promise<void>;
    parseRecipient(address: string): Promise<'spark' | 'bitcoin' | 'lightning'>;
    paySparkInvoice(invoice: string): Promise<{ paymentId: string; preimage?: string }>;
    createSparkInvoice(): Promise<string>;

    on<K extends keyof BreezEvent>(eventName: K, callback: BreezEvent[K]): void
    off<K extends keyof BreezEvent>(eventName: K, callback: BreezEvent[K]): void

    identityPubkey: string;
    nostrConnection: NostrConnection
}

/**
 * Authentication methods available
 */
export type AuthMethod = { type: 'mnemonic', mnemonic: string } | { type: 'nsec', nsec: string } | { type: 'passkey' } | { type: 'nostrExtension' }

/**
 * Authentication configuration
 */
export interface AuthConfig {
    seed: Seed;
    breezApiKey: string;
    relayConfig?: RelayConfig
}

/**
 * SDK Error class
 */
export class SDKError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'SDKError';
    }
}

/**
 * Payment receipt
 */
export type Receipt = {
    date: Date
    recipient?: string
    amount: number
    transaction: string
    description?: string
    paymentId?: string
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
    notification?: NotificationSettings,
    org?: OrgSettings
}

export type PaymentRequest = {
    id: string,
    pubkey: string,
    amount: number;
    description?: string;
    items?: Array<{ title: string, description?: string, amount: number }>;
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
    vat: number
}