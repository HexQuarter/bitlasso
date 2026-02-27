import type React from "react";
import { useEffect, useState } from "react";

import * as bip39 from '@scure/bip39';
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { NotificationSettingsForm, type NotificationSettings } from "./notification-setting";

type Props = {
    onSubmit: (mnemonic: string, notificationSettings: NotificationSettings) => void
    onBack: () => void
    loading: boolean
}

export const CreateWalletForm: React.FC<Props> = ({ onSubmit, onBack, loading = false }) => {
    const [mnemonic, setMnemonic] = useState<string[]>(["", "", "", "", "", "", "", "", "", "", "", ""]);
    const [email, setEmail] = useState<undefined | string>(undefined)
    const [npub, setNpub] = useState<undefined | string>(undefined)

    useEffect(() => {
        const generatedMnemonic = bip39.generateMnemonic(wordlist);
        setMnemonic(generatedMnemonic.split(' '));
    }, []);


    const copy = async () => {
        await navigator.clipboard.writeText(mnemonic.join(' '))
        const toastId = toast.info('Your passphrase have been copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    const handleSubmit = () => {
        onSubmit(mnemonic.join(' '), { email, npub })
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2">
                    <p className="text-sm">Write these words down safely as they unlock your wallet.</p>
                    <p className="text-sm">Be careful, no one can help if you lose this.</p>
                </div>
                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {mnemonic.map((word, index) => (
                            <div className='border-1 border-input items-center flex justify-center rounded-sm text-muted-foreground font-medium shadow-xs text-sm h-10' key={index}>{word}</div>
                        ))}
                    </div>
                    <div className='flex text-sm text-gray-600 gap-2 justify-end' onClick={() => copy()}>
                        <Copy className="w-5" />
                    </div>
                    <div className="mt-4">
                        <NotificationSettingsForm
                            onEmailChange={setEmail}
                            onNPubChange={setNpub}
                            email={email} 
                            npub={npub} />
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