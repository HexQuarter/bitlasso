import type React from "react";
import { useEffect, useState } from "react";

import * as bip39 from '@scure/bip39';
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
    onSubmit: (mnemonic: string) => void
    onBack: () => void
    loading: boolean
}

export const CreateWalletForm: React.FC<Props> = ({ onSubmit, onBack, loading = false }) => {
    const [mnemonic, setMnemonic] = useState<string[]>(["", "", "", "", "", "", "", "", "", "", "", ""]);

    useEffect(() => {
        const generatedMnemonic = bip39.generateMnemonic(wordlist);
        setMnemonic(generatedMnemonic.split(' '));
    }, []);

    const handleSubmit = () => {
        onSubmit(mnemonic.join(' '))
    }

    return (
        <div className="flex flex-col gap-5 p-10">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5">
                    <h1 className="w-full font-serif text-4xl font-normal text-foreground">Your wallet <span className="text-primary">is ready !</span></h1>
                    <div className="flex flex-col gap-2">
                        <p className="text-muted-foreground text-sm">We created a Spark-compatible Bitcoin wallet to issue work receipts and manage loyalty.</p>
                        <p className="text-muted-foreground text-sm">You can use it right away — your payment workspace is set up and ready to go.</p>
                    </div>
                </div>
            </div>
            <div className="flex lg:flex-row flex-col gap-2 items-center w-full">
                <Button variant='outline' className='flex-1 w-full' onClick={() => onBack()}>Back</Button>
                <Button type="submit" className='flex-1 w-full' onClick={handleSubmit} disabled={loading}>{loading && <Spinner />} Open the app</Button>
            </div>
        </div>
    )
}