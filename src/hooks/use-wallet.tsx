import { BareSparkWallet, type Wallet } from '@/lib/wallet';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface WalletContextType {
    storeWallet: (mnemonic: string) => Promise<Wallet>;
    wallet: Wallet | null;
    disconnect: () => void;
    walletExists: boolean;
}

export type Addresses = {
    btc: string
    ln: string
    spark: string
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletExists, setWalletExists] = useState(localStorage.getItem('BITLASSO_MNEMONIC') != null ? true : false)

    const loadWallet = async () => {
        const mnemonic = localStorage.getItem('BITLASSO_MNEMONIC')
        if (mnemonic) {
            const wallet = await BareSparkWallet.initialize(
                mnemonic
            );

            setWallet(wallet);
            return wallet
        }
    }


    useEffect(() => {
        loadWallet()
        const handleStorage = async () => {
            await loadWallet()
        }
        addEventListener('storage', handleStorage);

        return () => {
            removeEventListener('storage', handleStorage);
        };
    }, [])

    const disconnect = () => {
        console.log('disconnecting')
        localStorage.removeItem('BITLASSO_MNEMONIC')
        setWallet(null)
        setWalletExists(false)
    };

    const storeWallet = async (mnemonic: string) => {
        localStorage.setItem('BITLASSO_MNEMONIC', mnemonic)
        const wallet = await loadWallet()
        if (!wallet) throw new Error("Failed to load wallet after storing mnemonic")
        setWalletExists(true)
        return wallet
    }

    return (
        <WalletContext.Provider value={{ wallet, disconnect, walletExists, storeWallet }}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within WalletProvider');
    }
    return context;
}