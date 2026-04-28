import { useEffect, useState } from "react"
import { usePostHog } from "@posthog/react"

import { fetchOrganizationSettings, getNotifSettings, registerNotifSettings, type NotificationSettings, type OrgSettings, registerOrganizationSettings } from "@/lib/nostr"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { IconNotification } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, Copy, Eye, SaveAll, Terminal, Zap } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { WindowNostr } from 'nostr-tools/nip07'
import { hexToBytes } from "nostr-tools/utils"
import { bech32 } from "bech32"
import { getApiUrl } from "@/lib/api"
import { CgOrganisation } from "react-icons/cg";

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
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ email: '', npub: '', webhook: '' })
    const [mnemonic, setMnemonic] = useState<string[]>([])
    const [saveLoading, setSaveLoading] = useState(false)
    const [hasSecuredMnemonic, setHashSecureMnemonic] = useState(localStorage.getItem('BITLASSO_SECURED_MNEMONIC') || 'false')
    const [snippet, setSnippet] = useState('')

    const [orgSettings, setOrgSettings] = useState<OrgSettings>({ name: '', vat: 0.0, registrationNumber: '' })
    const [orgSettingSaveLoading, setOrgSettingsSaveLoading] = useState(false)

    useEffect(() => {
        if (!wallet) return

        const fetchData = async () => {
            const org = await fetchOrganizationSettings(wallet)
            if (org) {
                setOrgSettings(org)
            }

            const notif = await getNotifSettings(wallet)
            if (notif) {
                setNotificationSettings(notif)
            }

            const identityPubkey = await wallet.getIdentityPubkey()
            setInitializing(false)

            if (wallet) {
                const tokenMetadata = await wallet?.getTokenMetadata()
                setSnippet(`curl -X POST ${getApiUrl('/payment-request')} \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "${wallet?.getNostrPublicKey()}", 
    "pubkey": "${identityPubkey}",
    "tokenId": "${tokenMetadata?.identifier}",
    "amount": 1000,
    "description": "Payment for services"
  }'`)
            }
        }

        fetchData()
    }, [wallet])

    const handleSaveOrgSettings = async () => {
        if (!wallet) return
        setOrgSettingsSaveLoading(true)
        await registerOrganizationSettings(wallet, orgSettings)
        void (() => posthog?.capture('organization_settings_saved', {}))()

        setTimeout(() => {
            setOrgSettingsSaveLoading(false)
            toast.success('Your organization settings have been saved')
        }, 1000)
    }

    const handleSave = async () => {
        if (!wallet) return
        setSaveLoading(true)
        await registerNotifSettings(wallet, notificationSettings)
        void (() => posthog?.capture('notification_settings_saved', {
            has_email: !!(notificationSettings.email && notificationSettings.email !== ''),
            has_npub: !!(notificationSettings.npub && notificationSettings.npub !== ''),
        }))()

        setTimeout(() => {
            setSaveLoading(false)
            toast.success('Your notification settings have been saved')
        }, 1000)
    }

    const handleRevealSecret = () => {
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
    }

    const signNostrConnect = async () => {
        const pubkey = await window.nostr?.getPublicKey() as string
        const pkBytes = hexToBytes(pubkey);
        const npub = bech32.encode('npub', bech32.toWords(pkBytes))

        setNotificationSettings((prev: NotificationSettings) => ({ ...prev, npub }))
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
                                <CardHeader className="text-gray-500 text-xs flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/10 p-3 rounded-full items-center"><IconNotification className="h-4 w-4 text-primary" /></span>
                                        <span className="font-mono uppercase tracking-wider">Wallet</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-5">
                                    {hasSecuredMnemonic == 'true' && <Alert className="bg-primary/10 border-1 border-primary/20">
                                        <AlertTriangleIcon />
                                        <AlertTitle>Secure your wallet</AlertTitle>
                                        <AlertDescription className="flex flex-col gap-2">
                                            <p className="text-sm">Your wallet is protected by a secret phrase that only you have access to.</p>
                                            <p className="text-sm text-primary font-semibold">No account recovery, no reset link, no support ticket can get it back if lost.</p>
                                            <p className="text-sm">You can export and secure it anytime from your dashboard.</p>
                                        </AlertDescription>
                                    </Alert>
                                    }
                                    <div className="flex justify-between">
                                        {mnemonic.length == 0 && <Button variant='outline' className={`text-sm gap-2 justify-start lg:p-6 group ${nostrExtension ? 'flex-1' : ''}`} onClick={handleRevealSecret}>
                                            <div className="flex items-center gap-2">
                                                <Eye />
                                                <p className="flex items-center gap-2">Reveal passphrase</p>
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
                                                    className={`text-sm gap-2 justify-start group px-4`}
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
                                            <div className="flex gap-2 lg:flex-row flex-col">
                                                <Button
                                                    className={`text-sm gap-2 justify-start group px-4 ${nostrExtension ? 'w-1/2' : ''}`}
                                                    variant='default'
                                                    onClick={handleSave} disabled={saveLoading}>
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <SaveAll />
                                                        <p className="flex items-center gap-2">Save {saveLoading && <Spinner />}</p>
                                                    </div>
                                                </Button>
                                                {nostrExtension && <Button
                                                    className="text-sm flex justify-start gap-2 w-1/2 flex flex-row group px-4"
                                                    variant='outline'
                                                    onClick={signNostrConnect} >
                                                    <div className="flex gap-2 items-center">
                                                        <Zap />
                                                        <p>Fill with Nostr ext.</p>
                                                    </div>
                                                </Button>}
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
                                    <div className="flex flex-col gap-2 mt-4">
                                        <Label className="text-xs text-muted-foreground font-mono">Snippet to create payment requests programmatically</Label>
                                        <div className="relative group">
                                            <pre className="p-3 rounded-md bg-zinc-950 text-zinc-300 text-[10px] overflow-x-auto font-mono border border-zinc-800">
                                                {snippet}
                                            </pre>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute border text-white top-2 right-2  h-6 w-6 p-4"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(snippet)
                                                    toast.success('CURL snippet copied')
                                                }}
                                            >
                                                <Copy className="h-3 w-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
