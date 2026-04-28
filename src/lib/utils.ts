import { BTCAsset, type Asset } from "@/components/dashboard/send";
import { bech32m } from "bech32";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TokenBalanceMap, TokenMetadata, Wallet } from "./wallet";
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

      if (error.message.includes('insufficient funds')) {
        toast.error(`Failed to send ${asset.symbol}: insufficient funds`)
      }
      else {
        toast.error(`Failed to send ${asset.symbol}: ${error.message}`)
        console.error(error.message)
      }

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

export const addTokenBalance = (tokenBalance: TokenBalanceMap | undefined, tokenMetadata: TokenMetadata, amount: number): TokenBalanceMap => {
  if (!tokenBalance) {
    const map = new Map() as TokenBalanceMap
    map.set(tokenMetadata!.identifier, {
      balance: BigInt(amount * (10 ** tokenMetadata.decimals)),
      tokenMetadata
    })
    return map
  }

  const updated = new Map(tokenBalance)
  const entry = updated.get(tokenMetadata.identifier)
  const addition = BigInt(amount * (10 ** tokenMetadata.decimals))

  if (!entry) {
    updated.set(tokenMetadata.identifier, {
      balance: addition,
      tokenMetadata
    })
    return updated
  }

  updated.set(tokenMetadata.identifier, {
    ...entry,
    balance: entry.balance + addition
  })
  return updated
}

export const subTokenBalance = (tokenBalance: TokenBalanceMap | undefined, tokenMetadata: TokenMetadata, amount: number): TokenBalanceMap | undefined => {
  if (!tokenBalance) return tokenBalance
  const updated = new Map(tokenBalance)
  const entry = updated.get(tokenMetadata.identifier)
  if (!entry) return tokenBalance

  const decimalsFactor = BigInt(10) ** BigInt(tokenMetadata.decimals)
  const substraction = BigInt(amount) * decimalsFactor

  updated.set(tokenMetadata.identifier, {
    ...entry,
    balance: entry.balance - substraction
  })
  return updated
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export const encryptData = async (data: ArrayBuffer, key: CryptoKey) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  const base64Combined = btoa(String.fromCharCode(...combined));
  return base64Combined
}

export const decryptData = async (base64Combined: string, key: CryptoKey) => {
  const combined = new Uint8Array(atob(base64Combined).split('').map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );
  const plaintext = new TextDecoder().decode(decryptedBuffer);

  return plaintext;
}