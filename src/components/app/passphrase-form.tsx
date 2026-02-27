import type React from "react";
import { useEffect, useState } from "react";

import * as bip39 from '@scure/bip39';
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NotificationSettingsForm, type NotificationSettings } from "./notification-setting";

type Props = {
    onSubmit: (mnemonic: string, noticiationSettings: NotificationSettings) => void
    loading: boolean
    onBack: () => void
}

export const PassphraseForm: React.FC<Props> = ({ onSubmit, onBack, loading = false }) => {
    const [mnemonic, setMnemonic] = useState<string[]>(["", "", "", "", "", "", "", "", "", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [valid, setValid] = useState<boolean>(false);
    const [email, setEmail] = useState<undefined | string>(undefined)
    const [npub, setNpub] = useState<undefined | string>(undefined)

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(mnemonic.join(' '), { email, npub })
    }

    return (
        <form className="bg-white" onSubmit={handleSubmit}>
            <FieldGroup>
                <FieldLabel>Enter your passphrase</FieldLabel>
                <div className="grid grid-cols-3 gap-4 text-center">
                    {mnemonic.map((_word, index) => (
                        <Field key={index}>
                            <Input
                                className="text-muted-foreground text-sm h-10"
                                required
                                onChange={(e) => {
                                    handleMnemonicChange(e, index);
                                }}
                                value={mnemonic[index]}
                            />
                        </Field>
                    ))}
                </div>
                {valid && <div className="mt-4">
                    <NotificationSettingsForm
                        onEmailChange={setEmail}
                        onNPubChange={setNpub}
                        email={email}
                        npub={npub} />
                </div>}
                <div className="flex flex-col lg:flex-row gap-2">
                    <Button variant='outline' className='flex-1 w-full' onClick={() => onBack()}>Back</Button>
                    {error && <p className="col-span-3 text-red-500 text-sm italic mt-2">{error}</p>}
                    {valid && <Button type="submit" className='flex-1 w-full' disabled={loading}>{loading && <Spinner />} Join{loading && 'ing'} your workspace</Button>}
                </div>
            </FieldGroup>
        </form>
    )
}