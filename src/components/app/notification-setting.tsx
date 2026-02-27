import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type Props = {
    email?: string
    npub?: string
    onEmailChange: (email: string) => void
    onNPubChange: (email: string) => void
}

export type NotificationSettings = {
    email?: string
    npub?: string
}

export const NotificationSettingsForm: React.FC<Props> = ({ onEmailChange, onNPubChange, email = '', npub = '' }) => {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <p className="">Notification settings</p>
                <p className="text-sm text-muted-foreground">Enable notifications by providing your contact details.
                    <br />We’ll send you updates, such as when your payment is processed.
                </p>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                    <Label htmlFor="email" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="contact@...."
                        className="h-11 rounded-lg bg-background px-4 text-sm"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground/50 uppercase">or</span>
                    <Separator className="flex-1" />
                </div>
                <div className="flex flex-col gap-3">
                    <Label htmlFor="nostrpub" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Nostr pub
                    </Label>
                    <Input
                        id="nostrpub"
                        type="text"
                        placeholder="npub..."
                        className="h-11 rounded-lg bg-background px-4 text-sm"
                        value={npub}
                        onChange={(e) => onNPubChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}