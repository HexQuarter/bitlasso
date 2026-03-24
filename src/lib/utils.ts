import { BTCAsset, type Asset } from "@/components/app/send";
import { bech32m } from "bech32";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Wallet } from "./wallet";
import { toast } from "sonner";
import type { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function bin2hex(input: Uint8Array<ArrayBufferLike> | undefined): any {
  if (!input) return undefined;
  return Array.from(input, b => b.toString(16).padStart(2, "0")).join("");
}

export function shortenAddress(address: string, char: number = 10) {
  return `${address.slice(0, char)}...${address.slice(-char)}`
}

export function sparkBech32ToHex(bech32Id: string) {
  const decoded = bech32m.decode(bech32Id);
  const data = bech32m.fromWords(decoded.words);
  return Buffer.from(data).toString('hex');
}

export const send = (wallet: Wallet, asset: Asset, amount: number, recipient: string, method: "spark" | "lightning" | "bitcoin") => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      wallet.on('paymentSent', (payment) => {
        if (payment.details?.type == 'token') {
          toast.success(`Sent ${Number(payment.amount) / (10 ** payment.details.metadata.decimals)} ${asset.symbol} to ${shortenAddress(recipient)}.`)
        }
        else {
          toast.success(`Sent ${payment.amount} sats to ${shortenAddress(recipient)}.`)
        }
        resolve(payment.id)
      })
      wallet.on('paymentFailed', (payment) => {
        if (payment.details?.type == 'token') {
          toast.error(`Failed to send ${Number(payment.amount) / (10 ** payment.details.metadata.decimals)} ${asset.symbol} to ${shortenAddress(recipient)}.`)
        }
        else {
          toast.error(`Failed to send ${amount} sats to ${shortenAddress(recipient)}.`)
        }
        reject()
      })

      switch (method) {
        case 'spark':
          if (asset.symbol == BTCAsset.symbol) {
            const { paymentId: sparkTxID } = await wallet.sendSparkPayment(recipient, amount)
            console.log('Spark payment sent with tx ID:', sparkTxID)
            resolve(sparkTxID)
          }
          else if (asset.identifier) {
            const tokenMetadata = await wallet.getTokenMetadata(asset.identifier as Bech32mTokenIdentifier)
            if (tokenMetadata) {
              const tokenAmount = BigInt(amount * (10 ** tokenMetadata.decimals))
              const { paymentId: sparkTokenTxID } = await wallet.sendTokenTransfer(asset.identifier as Bech32mTokenIdentifier, tokenAmount, recipient)
              console.log('Spark payment sent with tx ID:', sparkTokenTxID)
              resolve(sparkTokenTxID)
            }
            else {
              toast.error(`Failed to send ${asset.name} tokens. Cannot find metadata`)
              reject()
            }
          }
          break;
        case 'lightning':
          const { paymentId: LnPaymentID } = await wallet.sendLightningPayment(recipient, amount)
          console.log('LN payment sent with tx ID:', LnPaymentID)
          resolve(LnPaymentID)
          break;
        case 'bitcoin':
          const { paymentId: btcTxID } = await wallet.sendOnChainPayment(recipient, amount)
          console.log('BTC payment sent with tx ID:', btcTxID)
          resolve(btcTxID)
          break;
      }
    } catch (e) {
      const error = e as Error
      console.error(error.message)
      toast.error(`Failed to send ${asset.symbol}: ${error.message}`)
      reject()
    }
  })
}

export function toBaseUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const fractionPadded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fractionPadded || "0");
}

export const uint8ArrayToNum = (data: Uint8Array) => data.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
