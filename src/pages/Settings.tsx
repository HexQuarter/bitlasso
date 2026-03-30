import { useEffect, useState } from "react"
import { usePostHog } from "@posthog/react"

import { getNotifSettings, registerNotifSettings } from "@/lib/nostr"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { IconNotification } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { type NotificationSettings } from "@/components/dashboard/notification-setting"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, Copy, Eye, SaveAll, Zap } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { WindowNostr } from 'nostr-tools/nip07'
import { hexToBytes } from "nostr-tools/utils"
import { bech32 } from "bech32"

declare global {
    interface Window {
        nostr?: WindowNostr
    }
}
const hasNostr = () => typeof window !== 'undefined' && !!window.nostr

export const SettingsPage = () => {
    const { wallet } = useWallet()
    const posthog = usePostHog()
    const [initializing, setInitializing] = useState(true)
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ email: '', npub: '' })
    const [mnemonic, setMnemonic] = useState<string[]>([])
    const [saveLoading, setSaveLoading] = useState(false)
    const [hasSecuredMnemonic, setHashSecureMnemonic] = useState(localStorage.getItem('BITLASSO_SECURED_MNEMONIC') || 'false')

    useEffect(() => {
        if (!wallet) return

        const fetchData = async () => {
            const notif = await getNotifSettings(wallet)
            if (notif) {
                setNotificationSettings(notif)
            }

            setInitializing(false)
        }

        fetchData()
    }, [wallet])

    const handleEmailChange = (val: string) => {
        setNotificationSettings({ email: val, npub: notificationSettings.npub })
    }

    const handleNpubChange = (val: string) => {
        setNotificationSettings({ email: notificationSettings.email, npub: val })
    }

    const handleSave = async () => {
        if (!wallet) return
        setSaveLoading(true)
        await registerNotifSettings(wallet, notificationSettings)
        setTimeout(() => posthog?.capture('notification_settings_saved', {
            has_email: !!(notificationSettings.email && notificationSettings.email !== ''),
            has_npub: !!(notificationSettings.npub && notificationSettings.npub !== ''),
        }))

        setTimeout(() => {
            setSaveLoading(false)
        }, 1000)
    }

    const handleRevealSecret = () => {
        const _mnemonic = localStorage.getItem('BITLASSO_MNEMONIC') as string
        setMnemonic(_mnemonic.split(' '))
        setTimeout(() => posthog?.capture('wallet_secret_revealed'))
    }

    const copy = async () => {
        await navigator.clipboard.writeText(mnemonic.join(' '))
        const toastId = toast.info('Your passphrase have been copied into the clipboard')
        setTimeout(() => {
            toast.dismiss(toastId)
        }, 2000)
    }

    const confirmSecuredMnemonic = () => {
        localStorage.setItem('BITLASSO_SECURED_MNEMONIC', 'true')
        setHashSecureMnemonic('true')
    }

    const signNostrConnect = async () => {
        const pubkey = await window.nostr?.getPublicKey() as string
        const pkBytes = hexToBytes(pubkey);
        const npub = bech32.encode('npub', bech32.toWords(pkBytes))

        setNotificationSettings((prev) => ({ ...prev, npub }))
    }

    const nostrExtension = hasNostr()

    return (
        <div className="flex flex-1 flex-col h-full w-full">
            <div className="flex flex-col w-full h-full">
                <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-col w-full gap-10">
                        <div className="flex flex-col gap-2 justify-between">
                            <h1 className="text-4xl font-serif font-normal text-foreground flex items-center gap-2">Settings {initializing && <Spinner className="text-primary" />}</h1>
                            <h2 className="text-1xl font-light text-muted-foreground">Configure your workspace.</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
                            <Card className="">
                                <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><IconNotification className="h-4 w-4 text-primary" /></span>
                                        Notification settings
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    {initializing &&
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <Skeleton className="h-3 w-full" />
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Skeleton className="h-3 w-full" />
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                        </>
                                    }
                                    {!initializing &&
                                        <>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='email' className="text-sm">Email:</Label>
                                                <Input
                                                    id='email'
                                                    className="text-xs"
                                                    value={notificationSettings.email}
                                                    onChange={(e) => handleEmailChange(e.target.value)} />
                                            </div>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='npub' className="text-sm">Nostr pub:</Label>
                                                <Input
                                                    id='npub'
                                                    className="text-xs"
                                                    value={notificationSettings.npub}
                                                    placeholder="npub..."
                                                    onChange={(e) => handleNpubChange(e.target.value)} />
                                            </div>
                                            <div className="flex gap-2 flex-col">
                                                <Button
                                                    className={`text-sm gap-2 justify-start group ${nostrExtension ? 'flex-1' : ''}`}
                                                    variant='default'
                                                    onClick={handleSave} disabled={saveLoading}>
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <div className="p-2 text-white rounded-full group-hover:bg-white group-hover:text-primary border-1 border-white/40">
                                                            <SaveAll />
                                                        </div>
                                                        <div className="flex flex-col text-left ">
                                                            <p className="flex items-center gap-2">Save {saveLoading && <Spinner />}</p>
                                                            <p className="text-white/80 text-xs">Used to confirm checkout payment</p>
                                                        </div>
                                                    </div>

                                                </Button>
                                                {nostrExtension && <Button
                                                    className="text-sm flex justify-start gap-2 flex-1 flex flex-row group"
                                                    variant='outline'
                                                    onClick={signNostrConnect} >
                                                    <div className="flex gap-2 items-center">
                                                        <div className="bg-primary/10 p-2 rounded-full group-hover:bg-white border-1 border-primary/20">
                                                            <Zap />
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <p>Fill-up in with Nostr extension </p>
                                                            <p className="text-muted-foreground text-xs">NIP-07 extension</p>
                                                        </div>
                                                    </div>
                                                </Button>}
                                            </div>
                                        </>
                                    }
                                </CardContent>
                            </Card>
                            <Card className="">
                                <CardHeader className="text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><IconNotification className="h-4 w-4 text-primary" /></span>
                                        <span className="font-mono uppercase tracking-wider">Wallet</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    {hasSecuredMnemonic == 'false' && <Alert className="bg-primary/10 border-1 border-primary/20">
                                        <AlertTriangleIcon />
                                        <AlertTitle>Secure your wallet before going live</AlertTitle>
                                        <AlertDescription className="flex flex-col gap-2">
                                            <p className="text-sm">Your wallet is protected by a secret phrase that only you have access to.</p>
                                            <p className="text-sm text-primary font-semibold">No account recovery, no reset link, no support ticket can get it back if lost.</p>
                                            <p className="text-sm">You can export and secure it anytime from your dashboard — we'll remind you until it's done.</p>
                                        </AlertDescription>
                                    </Alert>
                                    }
                                    <div className="flex flex-col lg:flex-row gap-2">
                                        {mnemonic.length == 0 && <Button variant='outline' className={`text-sm gap-2 justify-start lg:p-6 group ${nostrExtension ? 'flex-1' : ''}`} onClick={handleRevealSecret}>
                                            <div className="bg-primary/10 p-2 rounded-full group-hover:bg-white border-1 border-primary/20">
                                                <Eye />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <p className="flex items-center gap-2">Reveal passphrase</p>
                                                <p className="text-muted-foreground text-xs">Write it down safely</p>
                                            </div>
                                        </Button>}
                                    </div>
                                    {mnemonic.length > 0 &&
                                        <div className="flex flex-col gap-5">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                {mnemonic.map((word, index) => (
                                                    <div className='border-1 border-input items-center flex justify-center rounded-sm text-muted-foreground font-medium shadow-xs text-sm h-10' key={index}>{word}</div>
                                                ))}
                                            </div>
                                            <div className='flex text-sm text-gray-600 gap-2 justify-end' onClick={() => copy()}>
                                                <Copy className="w-5" />
                                            </div>
                                            {hasSecuredMnemonic == 'false' && <Button className="text-sm" onClick={confirmSecuredMnemonic}>I confirm my wallet have been securely exported</Button>}
                                        </div>
                                    }
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
