import { IconDashboard, IconSettings2, type Icon } from "@tabler/icons-react"
import { Link, useLocation, useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { shortenAddress } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOutIcon, Menu, MoreVertical, Wallet, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import LogoPng from '../../../public/logo.svg'

type NavItemType = {
  title: string
  url: string
  icon?: Icon,
  selected?: boolean,
  visible?: boolean
}

export function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()

  const { wallet } = useWallet()

  const [status, setStatus] = useState<undefined | { status: string, active: boolean }>({ status: 'degraded', active: false })
  const [sparkAddress, setSparkAddress] = useState("")

  const [menuItems, setMenuItems] = useState<NavItemType[]>([
    {
      title: 'Dashboard',
      url: '/app/dashboard',
      selected: true,
      icon: IconDashboard
    },
    {
      title: 'Settings',
      url: '/app/settings',
      icon: IconSettings2
    }
  ])

  useEffect(() => {
    setMenuItems(menuItems.map(menu => {
      menu.selected = menu.url == location.pathname
      return menu
    }))
  }, [location])

  useEffect(() => {
    if (wallet) {
      wallet.getSparkAddress().then(setSparkAddress)
      wallet.sparkStatus().then(setStatus)
    } sparkAddress
  }, [wallet])

  const logout = () => {
    localStorage.removeItem('BITLASSO_MNEMONIC')
    localStorage.removeItem('BITLASSO_NONCE')
    navigate('/', { replace: true })
  }

  const [open, setOpen] = useState(false)

  return (
    <header className="flex justify-between ">
      <div className="flex gap-10">
        <div className='font-serif tracking-tighter text-foreground flex items-center'>
          <p className="flex gap-2 items-end">
            <a className="text-4xl flex items-center gap-2" href='#'>
              <img src={LogoPng} className="h-10" />
              <span><span className="text-primary">bit</span>lasso</span>
            </a>
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {menuItems.map((m, i) => (
          <Link
            key={i}
            to={m.url}
            className={`flex items-center gap-1 ${m.selected ? 'text-primary' : ''} rounded-full px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-primary hover:text-foreground`}
          >
            {m.icon && <m.icon className="h-5" />}
            {m.title}
          </Link>
        ))}
        <div className="flex text-xs items-center gap-2 text-gray-500 hidden sm:flex">
          {wallet &&
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className="text-xs rounded-full flex items-center gap-1"><Wallet className="h-5" /> {shortenAddress(sparkAddress)} <MoreVertical /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs focus:text-primary focus:bg-primary/10 h-8 flex items-center gap-1" onClick={logout} >
                  <LogOutIcon className="h-5" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          }
          {status &&
            <Tooltip>
              <TooltipTrigger><div className={`${status.active ? 'bg-green-400' : 'bg-yellow-500'} rounded-full w-2 h-2`}></div></TooltipTrigger>
              <TooltipContent className="flex flex-col gap-2">
                <p>Connected to Spark</p>
                <p>Status: {status.status}</p>
              </TooltipContent>
            </Tooltip>
          }
        </div>
      </div>

      <div className="sm:hidden w-full">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="absolute z-10 top-12 p-5 right-0 border rounded-md flex flex-col gap-5 bg-white border-primary/20 text-xs">
            {menuItems.map((m, i) => (
              <button
                key={i}
                onClick={() => navigate(m.url)}
                className={`flex items-center gap-1 ${m.selected ? 'text-primary' : ''} rounded-full text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-primary hover:text-foreground`}
              >
                {m.icon && <m.icon className="h-5" />}
                {m.title}
              </button>
            ))}
            {wallet &&
              <>
                <button
                  onClick={logout}
                  className="w-full text-left hover:bg-primary/10 flex items-center text-muted-foreground gap-1"
                >
                  <LogOutIcon className="h-5" /> Logout
                </button>
              </>
            }
          </CollapsibleContent>
        </Collapsible>
      </div>

      <button
        className="flex items-center justify-center text-foreground md:hidden"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-primary" />}
      </button>
    </header >
  )
}
