import { SparkWallet, type Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";
import { ExitSpeed } from "@buildonspark/spark-sdk/types";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { getNostrKeyPair, type NostrKeyPair } from "./nostr";
import { finalizeEvent, type EventTemplate, type VerifiedEvent } from "nostr-tools";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { toast } from "sonner";

const BURN_PUBLIC_KEY =
    "020202020202020202020202020202020202020202020202020202020202020202";

const uint8ArrayToNum = (data: Uint8Array) => data.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);

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
}

export type SparkPaymentDirection = "INCOMING" | "OUTGOING"

interface _SparkWallet {
    getSparkAddress: () => Promise<string>;
    getBitcoinAddress: () => Promise<string>;
    getLightningAddress: () => Promise<string>;
    createLightningInvoice: (amountSats?: number, description?: string) => Promise<{ invoice: string }>;
    mintTokens: (amount: bigint) => Promise<{ id: string, timestamp: Date }>;
    burnTokens: (amount: bigint) => Promise<{ id: string, timestamp: Date }>;
    getTokenMetadata: (identifier?: string) => Promise<TokenMetadata | undefined>;
    getTokenStats: (tokenMetadata: TokenMetadata) => Promise<undefined | TokenStats>;
    createToken: (name: string, symbol: string, initialSupply: bigint, decimals: number, isFreezable: boolean) => Promise<{ tokenId: string }>;
    getBalance: () => Promise<Balance>;
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
}

interface NostrWallet {
    getNostrPublicKey(): string
    signNostrEvent(event: EventTemplate): VerifiedEvent
}

export type Wallet = _SparkWallet & NostrWallet

type Deposit = {
    txid: string;
    vout: number;
}

export class BareSparkWallet implements Wallet {
    private wallet: IssuerSparkWallet
    private nostrKeypair: NostrKeyPair | undefined
    private builderSparkWalletFn: (accountNumber: number) => Promise<IssuerSparkWallet>

    constructor(builderSparkWalletFn: (accountNumber: number) => Promise<IssuerSparkWallet>, sparkWallet: IssuerSparkWallet) {
        this.wallet = sparkWallet
        this.builderSparkWalletFn = builderSparkWalletFn

        this.wallet.on("deposit:confirmed", (depositId, updatedBalance) => {
            toast.info(`Deposit ${depositId} confirmed! New balance: ${updatedBalance}`);
        });
        this.wallet.on("transfer:claimed", (transferId, updatedBalance) => {
            console.log(`Incoming transfer ${transferId}! New balance: ${updatedBalance} sats`);
        });
    }

    async withAccountNumber(nonce: number): Promise<BareSparkWallet> {
        const sparkWallet = await this.builderSparkWalletFn(nonce)
        return new BareSparkWallet(this.builderSparkWalletFn, sparkWallet)
    }

    static async initialize(mnemonic: string): Promise<BareSparkWallet> {
        const { wallet } = await IssuerSparkWallet.initialize({ mnemonicOrSeed: mnemonic, accountNumber: 1, options: { network: "MAINNET" } })
        const buildSparkWalletFn = async (accountNumber: number) => {
            const { wallet } = await IssuerSparkWallet.initialize({ mnemonicOrSeed: mnemonic, accountNumber: accountNumber, options: { network: "MAINNET" } })
            return wallet
        }

        const instance = new BareSparkWallet(buildSparkWalletFn, wallet)
        instance.nostrKeypair = getNostrKeyPair(mnemonic)

        return instance
    }

    async getBalance(): Promise<Balance> {
        const balance = await this.wallet.getBalance()
        const tokenBalances = new Map() as TokenBalanceMap
        balance.tokenBalances.forEach(async (tb, id) => {
            tokenBalances.set(id, {
                balance: BigInt(tb.ownedBalance),
                tokenMetadata: {
                    identifier: id,
                    name: tb.tokenMetadata.tokenName,
                    symbol: tb.tokenMetadata.tokenTicker,
                    maxSupply: tb.tokenMetadata.maxSupply,
                    decimals: tb.tokenMetadata.decimals
                }
            })
        })

        return {
            balance: balance.balance,
            tokenBalances: tokenBalances
        }
    }

    async getBitcoinAddress(): Promise<string> {
        return await this.wallet.getStaticDepositAddress()
    }

    async getSparkAddress(): Promise<string> {
        return await this.wallet.getSparkAddress()
    }

    async getLightningAddress(): Promise<string> {
        const { invoice } = await this.wallet.createLightningInvoice({
            amountSats: 0,
            expirySeconds: 0
        })

        return invoice.encodedInvoice
    }

    async createLightningInvoice(amountSats?: number, description?: string): Promise<{ invoice: string }> {
        // Using the SparkWallet with receiverIdentityPubkey allows the backend to be notified once a Lightning payment is done
        const pubKey = await this.wallet.getIdentityPublicKey()
        const invoice = await this.wallet.createLightningInvoice({
            amountSats: amountSats || 0,
            memo: description,
            receiverIdentityPubkey: pubKey
        })
        return { invoice: invoice.invoice.encodedInvoice }
    }

    async mintTokens(amount: bigint): Promise<{ id: string, timestamp: Date }> {
        const [tokenIdentifier] = await this.wallet.getIssuerTokenIdentifiers()
        const id = await this.wallet.mintTokens({ tokenIdentifier, tokenAmount: amount })
        const transfer = await this.wallet.getTransfer(id)
        if (!transfer) {
            throw new Error("Cannot mint token")
        }
        return { id, timestamp: transfer.createdTime as Date };
    }

    async burnTokens(amount: bigint): Promise<{ id: string, timestamp: Date }> {
        const [tokenIdentifier] = await this.wallet.getIssuerTokenIdentifiers()
        const id = await this.wallet.burnTokens({ tokenIdentifier, tokenAmount: amount })
        const transfer = await this.wallet.getTransfer(id)
        if (!transfer) {
            throw new Error("Cannot mint token")
        }
        return { id, timestamp: transfer.createdTime as Date };
    }

    async getTokenMetadata(identifier?: string): Promise<TokenMetadata | undefined> {
        if (!identifier) {
            const [tokenIdentifier] = await this.wallet.getIssuerTokenIdentifiers()
            identifier = tokenIdentifier
        }
        const res = await this.wallet.getIssuerTokensMetadata([identifier as Bech32mTokenIdentifier]);
        if (res.length == 0) {
            return undefined
        }
        return {
            identifier: identifier,
            name: res[0].tokenName,
            symbol: res[0].tokenTicker,
            maxSupply: res[0].maxSupply,
            decimals: res[0].decimals,
        }
    }

    async getTokenStats(tokenMetadata: TokenMetadata): Promise<undefined | TokenStats> {
        try {
            const all = [];

            let cursor: string | undefined;

            do {
                const page = await this.wallet.queryTokenTransactionsWithFilters({
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

    async createToken(name: string, symbol: string, _initialSupply: bigint, decimals: number = 1, isFreezable: boolean = false): Promise<{ tokenId: string; }> {
        const tokenId = await this.wallet.createToken({
            tokenName: name,
            tokenTicker: symbol,
            decimals: decimals,
            isFreezable: isFreezable
        })

        return { tokenId };
    }

    async sendSparkPayment(address: string, amountSats: number): Promise<{ paymentId: string }> {
        const transfer = await this.wallet.transfer({ amountSats, receiverSparkAddress: address })
        return { paymentId: transfer.id };
    }

    async sendTokenTransfer(tokenIdentifier: string, amount: bigint, recipient: string): Promise<{ paymentId: string }> {
        const transferId = await this.wallet.transferTokens({ 
            tokenIdentifier: tokenIdentifier as Bech32mTokenIdentifier, 
            tokenAmount: amount, 
            receiverSparkAddress: recipient
        })
        return { paymentId: transferId };
    }

    async sendOnChainPayment(address: string, amountSats: number): Promise<{ paymentId: string }> {
        const feeQuote = await this.wallet.getWithdrawalFeeQuote({
            amountSats: 17000,
            withdrawalAddress: address
        });
        if (!feeQuote) {
            throw new Error("Cannot get the withrdrawal quote")
        }
        const feeAmountSats = (feeQuote.l1BroadcastFeeFast?.originalValue || 0) +
            (feeQuote.userFeeMedium?.originalValue || 0);

        const withdrawResult = await this.wallet.withdraw({
            onchainAddress: address,
            amountSats: amountSats,
            exitSpeed: ExitSpeed.FAST,
            feeQuoteId: feeQuote.id,
            feeAmountSats,
            deductFeeFromWithdrawalAmount: false,
        });
        if (!withdrawResult) {
            throw new Error("Cannot withdraw")
        }

        return { paymentId: withdrawResult.id }
    }

    async sendLightningPayment(invoice: string, amountSats?: number): Promise<{ paymentId: string }> {
        const feeEstimate = await this.wallet.getLightningSendFeeEstimate({
            encodedInvoice: invoice
        });

        const payment = await this.wallet.payLightningInvoice({ 
            invoice, 
            maxFeeSats: feeEstimate + 5, 
            preferSpark: true, 
            amountSatsToSend: amountSats ? amountSats : undefined
        })

        const ok = await checkPaymentStatus(payment.id, this.wallet)
        if (!ok) {
            throw new Error("Cannot send Lightning payment")
        }

        return { paymentId: payment.id }
    }

    async getTransferFee(type: 'spark' | 'bitcoin' | 'token' | 'lightning', addressOrInvoice: string, amountSats?: number): Promise<number> {
        switch (type) {
            case 'spark': return 0
            case 'token': return 0
            case "lightning":
                const lightningFee = await this.wallet.getLightningSendFeeEstimate({
                    encodedInvoice: addressOrInvoice
                })
                return lightningFee
            case 'bitcoin':
                const exitFee = await this.wallet.getWithdrawalFeeQuote({
                    amountSats: amountSats || 0,
                    withdrawalAddress: addressOrInvoice
                });
                if (!exitFee) {
                    throw new Error("Cannot estimate fee withdraw")
                }
                return exitFee.totalAmount.originalValue
        }
    }

    async createSparkAddress(id: number): Promise<string> {
        const sparkWallet = await this.builderSparkWalletFn(id)
        await sparkWallet.setPrivacyEnabled(false)
        return await sparkWallet.getSparkAddress()
    }

    async createBitcoinAddress(_id: number): Promise<string> {
        return await this.wallet.getSingleUseDepositAddress()
    }

    async listPayments(): Promise<SparkPayment[]> {
        const PAGE_SIZE = 20;
        let offset = 0;
        let allTransfers = [];

        while (true) {
            const { transfers } = await this.wallet.getTransfers(PAGE_SIZE, offset);
            allTransfers.push(...transfers);

            if (transfers.length < PAGE_SIZE) break; // No more pages
            offset += PAGE_SIZE;
        }

        return allTransfers.map(t => {
            return {
                id: t.id,
                amount: BigInt(t.totalValue),
                direction: t.transferDirection,
                timestamp: (t.createdTime as Date).getTime()
            } as SparkPayment
        })
    }

    async listUnclaimDeposits(): Promise<Deposit[]> {
        const PAGE_SIZE = 20;
        let offset = 0;
        let allUTXOs = [];
        const depositAddress = await this.wallet.getStaticDepositAddress()
        while (true) {
            const utxos = await this.wallet.getUtxosForDepositAddress(
                depositAddress,
                PAGE_SIZE,
                offset,
                true
            );
            allUTXOs.push(...utxos);

            if (utxos.length < PAGE_SIZE) break; // No more pages
            offset += PAGE_SIZE;
        }

        return allUTXOs as Deposit[]
    }

    async claimDeposit(txId: string, _vout: number): Promise<void> {
        try {
            // For single used deposit
            await this.wallet.claimDeposit(txId);
        }
        catch (e) { }

        try {
            const quote = await this.wallet.getClaimStaticDepositQuote(txId);
            await this.wallet.claimStaticDeposit({
                transactionId: txId,
                creditAmountSats: quote.creditAmountSats,
                sspSignature: quote.signature,
            });
        }
        catch (e) { }
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
}


const checkPaymentStatus = async (paymentId: string, wallet: SparkWallet) => {
  const paymentStatus = await wallet.getLightningSendRequest(paymentId);
  if (!paymentStatus) {
    throw new Error("cannot check lightning payment status")
  }
  switch (paymentStatus.status) {
    case "TRANSFER_COMPLETED":
      console.log("Lightning payment completed!");
      return true;
    case "TRANSFER_FAILED":
      console.log("Lightning payment failed");
      return false;
    default:
      console.log("Lightning payment pending...");
      setTimeout(() => checkPaymentStatus(paymentId, wallet), 5000);
      return false;
  }
};

// const checkWithdrawalStatus = async (withdrawalId: string, wallet: SparkWallet) => {
//   const exitRequest = await wallet.getCoopExitRequest(withdrawalId);
//   if (!exitRequest) {
//     throw new Error("cannot get exit request")
//   }

//   switch (exitRequest.status) {
//     case "SUCCEEDED":
//       console.log("Withdrawal completed!");
//       console.log("On-chain txid:", exitRequest.coopExitTxid);
//       return true;
//     case "FAILED":
//       console.log("Withdrawal failed");
//       return false;
//     default:
//       console.log("Withdrawal pending...");
//       setTimeout(() => checkWithdrawalStatus(withdrawalId, wallet), 30000);
//       return false;
//   }
// };