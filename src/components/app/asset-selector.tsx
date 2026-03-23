import type { Asset } from "./send"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
    assets: Asset[]
    onSelected: (asset: Asset) => void
}

export const AssetSelector: React.FC<Props> = ({ assets, onSelected }) => {
    return (
        <div className="w-full flex flex-col gap-2">
            <p className="text-sm">Select an asset</p>
            <Select onValueChange={(val: string) => onSelected(assets[parseInt(val)])}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Bitcoin" />
                </SelectTrigger>
                <SelectContent>
                    {assets.map((a, i) => (
                        <SelectItem key={i} value={i.toString()}>{a.name} {a.name.toLowerCase() != 'bitcoin' ? `(${a.symbol})`: ''}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}