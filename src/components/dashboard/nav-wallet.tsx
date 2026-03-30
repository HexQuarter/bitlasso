import {
  IconDotsVertical,
  IconLogout,
} from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWallet } from "@/hooks/use-wallet"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { shortenAddress } from "@/lib/utils"
import { useEffect, useState } from "react"

export function NavWallet() {
  const { wallet, disconnect } = useWallet()
  const [sparkAddress, setSparkAddress] = useState<string | null>(null)

  const copyWallet = () => {
    if (!sparkAddress) return
    navigator.clipboard.writeText(sparkAddress)
    const toastId = toast.info('Wallet address copied into the clipboard')
    setTimeout(() => {
      toast.dismiss(toastId)
    }, 2000)
  }

  const logout = async () => {
    if (!wallet) {
      return
    }
    await disconnect()
    setTimeout(() => {
      window.location.replace('/')
    }, 200)
  }

  useEffect(() => {
    const fetchAddress = async () => {
      if (wallet) {
        const sparkAddress = await wallet.getSparkAddress()
        setSparkAddress(sparkAddress)
      }
    }

    fetchAddress()
  }, [wallet])


  return (
    <>
      {!sparkAddress && <Spinner className="text-primary" />}
      {sparkAddress &&
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='link'
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-white"
            >
              <div className="flex-1 flex gap-5 text-left text-sm leading-tight">
                <span className="truncate font-medium">Connected as <strong>{shortenAddress(sparkAddress)}</strong></span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="text-left text-sm leading-tight flex gap-5">
                  <span className="truncate font-medium">{sparkAddress}</span>
                  <CopyIcon className="h-4" onClick={() => copyWallet()} />
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    </>
  )
}
