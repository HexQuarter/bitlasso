import type { Asset } from "@/components/app/send";
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

export function shortenAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-10)}`
}

export function sparkBech32ToHex(bech32Id: string) {
  const decoded = bech32m.decode(bech32Id);
  const data = bech32m.fromWords(decoded.words);
  return Buffer.from(data).toString('hex');
}

export const send = (wallet: Wallet, asset: Asset, amount: number, recipient: string, method: "spark" | "lightning" | "bitcoin") => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      toast.info(`Sending ${amount} ${asset.symbol} to ${shortenAddress(recipient)}.`)

      const satsAmount = Math.floor(amount * 100_000_000)
      switch (method) {
        case 'spark':
          if (asset.symbol == 'BTC') {
            const txId = await wallet.sendSparkPayment(recipient, satsAmount)
            console.log('Spark payment sent with tx ID:', txId)
          }
          else if (asset.identifier) {
            const tokenMetadata = await wallet.getTokenMetadata(asset.identifier as Bech32mTokenIdentifier)
            if (tokenMetadata) {
              const tokenAmount = BigInt(amount * (10 ** tokenMetadata.decimals))
              await wallet.sendTokenTransfer(asset.identifier as Bech32mTokenIdentifier, tokenAmount, recipient)
              resolve()
            }
            else {
              toast.error(`Failed to send ${asset.name} tokens. Cannot find metadata`)
              reject()
            }
          }
          break;
        case 'lightning':
          await wallet.sendLightningPayment(recipient, satsAmount)
          resolve()
          break;
        case 'bitcoin':
          await wallet.sendOnChainPayment(recipient, satsAmount)
          resolve()
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

