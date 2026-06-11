import { useEffect, useState } from "react"
import { usePostHog } from "@posthog/react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { IconNotification } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, CheckCircle2, Copy, Eye, SaveAll, Shield, Terminal, Zap } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CgOrganisation } from "react-icons/cg";
import { getWallet, isPasskeyMode } from "@/lib/passkey"
import { connectViaExtension, encryptPassphrase, isNostrExtensionAvailable, fetchEncryptedPassphrase, fetchSettings, registerSettings, storeEncryptedPassphrase, type NotificationSettings, type OrgSettings, type UserSettings, RelayConfig } from "@bitlasso/sdk"


export const SettingsPage = () => {
    const relayConfig = new RelayConfig({ dev: import.meta.env.DEV })
    const nostrExtension = isNostrExtensionAvailable()

    const { wallet } = useWallet()
    const posthog = usePostHog()
    const [initializing, setInitializing] = useState(true)
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ email: '', npub: '', webhook: '' })
    const [mnemonic, setMnemonic] = useState<string[]>([])
    const [saveNotifLoading, setSaveNotifLoading] = useState(false)
    const [hasSecuredMnemonic, setHashSecureMnemonic] = useState(localStorage.getItem('BITLASSO_SECURED_MNEMONIC') || 'false')
    const [jsSnippet, setJsSnippet] = useState(`import { initializeWallet, Client } from '@bitlasso/sdk'

const wallet = await initializeWallet({
    seed: { type: 'mnemonic', mnemonic: '' },
    breezApiKey: 'your-breez-api'
})

// Your payment request data
const paymentRequest = {
    items: [
      {
        title: 'Consulting session',
        description: '1 hour of consulting',
        amount: 1000
      }
    ]
}

// Generate NIP-98 authentication
const api = new Client()
const response = await client.publishPaymentRequest(wallet, paymentRequest)
`)

    const [orgSettings, setOrgSettings] = useState<OrgSettings>({ name: '', vat: 0.0, registrationNumber: '' })
    const [orgSettingSaveLoading, setOrgSettingsSaveLoading] = useState(false)
    const [nostrBackup, setNostrBackup] = useState<undefined | boolean>(undefined)
    const [nostrBackupLoading, setNostrBackupLoading] = useState(false)

    useEffect(() => {
        if (!wallet) return

        const fetchData = async () => {
            let settings = await fetchSettings(relayConfig, wallet)
            if (settings?.notification) {
                setNotificationSettings(settings.notification)
            }
            if (settings?.org) {
                setOrgSettings(settings.org)
            }

            if (!settings) {
                settings = { sparkIdentityKey: wallet.identityPubkey } as UserSettings
            }
            if (!settings.sparkIdentityKey) {
                settings.sparkIdentityKey = wallet.identityPubkey
            }
            await registerSettings(relayConfig, wallet, settings)

            setInitializing(false)

            if (nostrExtension) {
                const nostrConnection = await connectViaExtension()
                const encryptedPassphrase = await fetchEncryptedPassphrase(relayConfig, wallet.nostrConnection.pubkey)
                if (!encryptedPassphrase) {
                    setNostrBackup(false)
                }
                else {
                    setNostrBackup(nostrConnection.pubkey !== wallet.nostrConnection.pubkey)
                }
            }
        }

        fetchData()
    }, [wallet])

    const handleSaveOrgSettings = async () => {
        if (!wallet) return
        setOrgSettingsSaveLoading(true)

        let settings = await fetchSettings(relayConfig, wallet)
        if (!settings) {
            settings = { org: orgSettings } as UserSettings
        }
        else {
            settings.org = orgSettings
        }

        await registerSettings(relayConfig, wallet, settings)
        void (() => posthog?.capture('organization_settings_saved', {}))()

        setTimeout(() => {
            setOrgSettingsSaveLoading(false)
            toast.success('Your organization settings have been saved')
        }, 1000)
    }

    const handleSaveNotifSettings = async () => {
        if (!wallet) return
        setSaveNotifLoading(true)

        let settings = await fetchSettings(relayConfig, wallet)
        if (!settings) {
            settings = { notification: notificationSettings } as UserSettings
        }
        else {
            settings.notification = notificationSettings
        }

        await registerSettings(relayConfig, wallet, settings)

        void (() => posthog?.capture('notification_settings_saved', {}))()

        setTimeout(() => {
            setSaveNotifLoading(false)
            toast.success('Your notification settings have been saved')
        }, 1000)
    }

    const handleRevealSecret = async () => {
        if (isPasskeyMode()) {
            try {
                const wallet = await getWallet()
                if (wallet.seed.type == 'mnemonic') {
                    setMnemonic(wallet.seed.mnemonic.split(' '))
                }
            }
            catch (error) {
                console.error('Failed to retrieve passkey wallet', error)
            }
        }

        const _mnemonic = localStorage.getItem('BITLASSO_MNEMONIC') as string
        setMnemonic(_mnemonic.split(' '))
        void (() => posthog?.capture('wallet_secret_revealed'))()
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
        setMnemonic([])
    }

    const signNostrConnect = async () => {
        const connection = await connectViaExtension()
        setNotificationSettings((prev: NotificationSettings) => ({ ...prev, npub: connection.npub }))
    }

    const handleSecureWithNostr = async () => {
        try {
            setNostrBackupLoading(true)
            const connection = await connectViaExtension()

            let passphrase: string | null = null

            if (isPasskeyMode()) {
                try {
                    const wallet = await getWallet()
                    if (wallet.seed.type == 'mnemonic') {
                        passphrase = wallet.seed.mnemonic
                    }
                }
                catch (error) {
                    console.error('Failed to retrieve passkey wallet', error)
                    toast.error('Failed to retrieve passkey wallet')
                    setNostrBackupLoading(false)
                    return
                }
            }
            else {
                passphrase = localStorage.getItem('BITLASSO_MNEMONIC')
            }

            if (!passphrase) {
                toast.error('Failed to retrieve mnemonic')
                setNostrBackupLoading(false)
                return
            }

            const encryptedPassphrase = encryptPassphrase(passphrase, connection)
            await storeEncryptedPassphrase(relayConfig, connection, encryptedPassphrase)

            setTimeout(() => {
                setNostrBackupLoading(false)
                setNostrBackup(true)
                confirmSecuredMnemonic()
                const toastId = toast.success('Your passphrase has been secured with your Nostr identity')
                setTimeout(() => {
                    toast.dismiss(toastId)
                }, 2000)
            }, 1000)
        }
        catch (error) {
            setNostrBackupLoading(false)
            console.error('Failed to secure passphrase with Nostr', error)
            toast.error(`Failed to secure your passphrase with Nostr`)
        }
    }

    return (
        <div className="flex flex-1 flex-col h-full w-full">
            <div className="flex flex-col w-full h-full">
                <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-col w-full gap-10">
                        <div className="flex flex-col gap-2 justify-between">
                            <h1 className="text-4xl font-serif font-normal text-foreground flex items-center gap-2">Settings {initializing && <Spinner className="text-primary" />}</h1>
                            <h2 className="text-1xl font-light text-muted-foreground">Configure your workspace.</h2>
                        </div>
                        <div className="lg:grid xl:grid-cols-3 2xl:grid-cols-4 lg:gap-10 gap-5 flex flex-col">
                            <Card className="">
                                <CardHeader className="text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><IconNotification className="h-4 w-4 text-primary" /></span>
                                        <span className="font-mono uppercase tracking-wider">Wallet</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    {hasSecuredMnemonic != 'true' && <Alert className="bg-primary/10 border-1 border-primary/20">
                                        <AlertTriangleIcon />
                                        <AlertTitle>Secure your wallet</AlertTitle>
                                        <AlertDescription className="flex flex-col gap-2">
                                            <p className="text-sm">Your wallet is protected by a secret phrase that only you have access to.</p>
                                            <p className="text-sm text-primary font-semibold">No account recovery, no reset link, no support ticket can get it back if lost.</p>
                                            <p className="text-sm">You can export and secure it anytime from your dashboard.</p>
                                        </AlertDescription>
                                    </Alert>
                                    }
                                    {!initializing && nostrBackup === true &&
                                        <div>
                                            <p className="text-sm flex items-center gap-2 text-green-800 bg-green-100/50 border border-green-200 p-2 rounded-md">
                                                <CheckCircle2 />Your passphrase is backed up with your Nostr identity.
                                            </p>
                                        </div>}
                                    {!initializing && nostrExtension && nostrBackup === false &&
                                        <div className="flex flex-col gap-5">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-sm text-muted-foreground">You can backup your passphrase with your Nostr identity to avoid losing it.</p>
                                                <div>
                                                    <Button className="text-sm gap-2 px-4 w-full" onClick={() => handleSecureWithNostr()}>
                                                        {nostrBackupLoading ? <Spinner /> : <span className="flex items-center gap-2"><Shield />Secure your passphrase with Nostr</span>}
                                                    </Button>
                                                </div>
                                            </div>
                                            <hr />
                                        </div>
                                    }
                                    {mnemonic.length == 0 && <Button variant="outline" className={`w-full text-sm gap-2 justify-start group px-4`} onClick={handleRevealSecret}>
                                        <div className="flex items-center gap-2">
                                            <Eye />
                                            <p className="flex items-center gap-2">Reveal passphrase for export</p>
                                        </div>
                                    </Button>}
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
                                            {hasSecuredMnemonic == 'false' && <Button className="text-sm" onClick={confirmSecuredMnemonic}>Secured!</Button>}
                                        </div>
                                    }
                                </CardContent>
                            </Card>
                            <Card className="">
                                <CardHeader className="font-mono uppercase tracking-wider text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><CgOrganisation className="h-4 w-4 text-primary" /></span>
                                        Organization settings
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
                                                <Label htmlFor='org_name' className="text-sm">Name:</Label>
                                                <Input
                                                    id='org_name'
                                                    className="text-xs"
                                                    value={orgSettings.name}
                                                    placeholder="Enter your organization name"
                                                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })} />
                                            </div>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='org_vat' className="text-sm">VAT rate:</Label>
                                                <Input
                                                    id='org_vat'
                                                    className="text-xs"
                                                    value={orgSettings.vat}
                                                    placeholder="0.20"
                                                    onChange={(e) => setOrgSettings({ ...orgSettings, vat: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='org_vat' className="text-sm">Registration number:</Label>
                                                <Input
                                                    id='org_registration'
                                                    className="text-xs"
                                                    value={orgSettings.registrationNumber}
                                                    placeholder="Enter your registration number"
                                                    onChange={(e) => setOrgSettings({ ...orgSettings, registrationNumber: e.target.value })} />
                                            </div>
                                            <div className="flex gap-2 lg:flex-row flex-col">
                                                <Button
                                                    className={`text-sm gap-2 justify-start group px-4 w-full`}
                                                    variant='default'
                                                    onClick={handleSaveOrgSettings} disabled={orgSettingSaveLoading}>
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <SaveAll />
                                                        <p className="flex items-center gap-2">Save {orgSettingSaveLoading && <Spinner />}</p>
                                                    </div>
                                                </Button>
                                            </div>
                                        </>
                                    }
                                </CardContent>
                            </Card>
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
                                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email: e.target.value })} />
                                            </div>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='npub' className="text-sm">Nostr pub:</Label>
                                                <Input
                                                    id='npub'
                                                    className="text-xs"
                                                    value={notificationSettings.npub}
                                                    placeholder="npub..."
                                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, npub: e.target.value })} />
                                            </div>
                                            <div className="flex flex-col gap-2 w-full">
                                                <Label htmlFor='webhook' className="text-sm">Webhook:</Label>
                                                <Input
                                                    id='webhook'
                                                    className="text-xs"
                                                    value={notificationSettings.webhook}
                                                    placeholder="webhook..."
                                                    onChange={(e) => setNotificationSettings({ ...notificationSettings, webhook: e.target.value })} />
                                            </div>
                                            <div className="flex gap-2 2xl:flex-row flex-col justify-between">
                                                {nostrExtension && (notificationSettings.npub == undefined || notificationSettings.npub === '') && <Button
                                                    className="text-sm flex flex-1 justify-start gap-2 flex-row group px-4"
                                                    variant='outline'
                                                    onClick={signNostrConnect} >
                                                    <div className="flex gap-2 items-center">
                                                        <Zap />
                                                        <p>Fill with Nostr extension (Alby, nos2x, etc.)</p>
                                                    </div>
                                                </Button>}
                                                <div className="">
                                                    <Button
                                                        className={`text-sm gap-2 justify-start group px-4 w-full`}
                                                        variant='default'
                                                        onClick={handleSaveNotifSettings} disabled={saveNotifLoading}>
                                                        <div className="flex gap-2 justify-center items-center">
                                                            <SaveAll />
                                                            <p className="flex items-center gap-2">Save {saveNotifLoading && <Spinner />}</p>
                                                        </div>
                                                    </Button>
                                                </div>

                                            </div>
                                        </>
                                    }
                                </CardContent>
                            </Card>
                            <Card className="col-span-2">
                                <CardHeader className="text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><Terminal className="h-4 w-4 text-primary" /></span>
                                        <span className="font-mono uppercase tracking-wider">API</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    {initializing &&
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <Skeleton className="h-50 w-full" />
                                            </div>
                                        </>
                                    }
                                    {!initializing &&
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <Label className="text-xs text-muted-foreground font-mono">Create payment request programmatically</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Our API uses <a href="https://github.com/nostr-protocol/nips/blob/master/98.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NIP-98</a> authentication.
                                                    All requests must be signed with your Nostr private key
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Label className="text-xs text-muted-foreground font-mono">JavaScript example to create payment requests</Label>
                                                <div className="relative group">
                                                    <pre className="p-3 rounded-md bg-zinc-950 text-zinc-300 text-[10px] overflow-x-auto font-mono border border-zinc-800">
                                                        {jsSnippet}
                                                    </pre>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute border text-white top-2 right-2 h-6 w-6 p-4"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(jsSnippet)
                                                            toast.success('JavaScript snippet copied')
                                                        }}
                                                    >
                                                        <Copy className="h-3 w-2" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
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
