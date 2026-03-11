import type React from "react";
import { useEffect, useState } from "react";

import * as bip39 from '@scure/bip39';
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowUpRight } from "lucide-react";

type Props = {
    onSubmit: (mnemonic: string) => void
    loading: boolean
    onBack: () => void
}

export const PassphraseForm: React.FC<Props> = ({ onSubmit, onBack, loading = false }) => {
    const [mnemonic, setMnemonic] = useState<string[]>(["", "", "", "", "", "", "", "", "", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [valid, setValid] = useState<boolean>(false);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();

            setError(null);
            const clipboardData = e.clipboardData || (window as any).clipboardData;
            const pastedText = clipboardData.getData('Text').trim();

            const passphrase = [...Array(12)].map(() => '');
            const words = pastedText.split(/\s+/)
            words.forEach((word: string, index: number) => {
                passphrase[index] = word;
            });

            if (!bip39.validateMnemonic(passphrase.join(' '), wordlist)) {
                setValid(false);
                setError('Invalid passphrase. Please check the words and try again.');
                return;
            }

            setMnemonic(passphrase);
            setValid(true);
        };

        // Attach to the first input for simplicity
        const input = document.querySelector('input');
        if (input) {
            input.addEventListener('paste', handlePaste as any);
        }
        return () => {
            if (input) {
                input.removeEventListener('paste', handlePaste as any);
            }
        };

    }, []);

    const handleMnemonicChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        setError(null);
        const updated = [...mnemonic];
        updated[index] = e.target.value;
        const filledWords = updated.filter(word => word !== '').length;
        setMnemonic(updated);

        if (filledWords == 12 && !bip39.validateMnemonic(updated.join(' '), wordlist)) {
            setValid(false);
            setError('Invalid passphrase. Please check the words and try again.');
            return;
        }

        if (filledWords == 12) {
            setValid(true);
        }
    }

    const handleSubmit = () => {
        console.log('ok')
        onSubmit(mnemonic.join(' '))
    }

    return (
        <div className="bg-white flex flex-col gap-5 md:p-10 " >
            <div className="flex flex-col items-center gap-10">
                <h1 className="w-full font-serif text-4xl font-normal text-foreground">Connect your <span className="text-primary">wallet.</span></h1>
                <p className="text-muted-foreground">Sign in with a Spark-compatible Bitcoin wallet to issue work receipts and manage loyalty.</p>
            </div>

            <div className="flex flex-col gap-10">
                <div className="flex justify-between w-full items-center gap-5">
                    <span className="font-semibold text-sm flex-1">Enter your passphrase</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    {mnemonic.map((_word, index) => (
                        <Input
                            key={index}
                            className="text-muted-foreground text-sm h-10"
                            required
                            onChange={(e) => {
                                handleMnemonicChange(e, index);
                            }}
                            value={mnemonic[index]}
                        />
                    ))}
                </div>
                <div className="flex flex-col lg:flex-row gap-2">
                    <Button className='flex-1 w-full' variant='outline' onClick={() => onBack()}>Back</Button>
                    {valid && <Button onClick={() => handleSubmit()} className='flex-1 w-full' disabled={loading}>{loading && <Spinner />} Join{loading && 'ing'} your workspace <ArrowUpRight /></Button>}
                </div>
                {error && <p className="text-red-500 text-sm italic mt-2 text-center">{error}</p>}
            </div>
        </div>
    )
}