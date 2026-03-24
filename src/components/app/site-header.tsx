import { IconDashboard, IconSettings2, type Icon } from "@tabler/icons-react"
import { Link, useLocation, useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOutIcon, Menu, X } from "lucide-react"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import LogoPng from '../../../public/logo.svg'
import { useWallet } from "@/hooks/use-wallet"

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

  const handleLogout = async () => {
    await wallet!.disconnect()
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("BITLASSO")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    navigate('/', { replace: true })
  }

  const [open, setOpen] = useState(false)

  return (
    <header className="flex justify-between ">
      <div className="flex gap-10">
        <div className='font-serif tracking-tighter text-foreground flex items-center'>
          <p className="flex gap-2 items-end">
            <a className="text-4xl flex items-center gap-2" href='#/app'>
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
        <AlertDialogLogout onLogout={handleLogout} />
      </div>

      <div className="sm:hidden w-full">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent className="absolute z-10 top-12 p-5 right-5 border rounded-md flex flex-col gap-5 bg-white border-primary/20 text-xs">
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

            <AlertDialogLogout onLogout={handleLogout} />

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


const AlertDialogLogout: React.FC<{ onLogout: () => Promise<void> }> = ({ onLogout }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-primary hover:cursor-pointer focus-visible:border-0`}
          variant='ghost'>
          <LogOutIcon className="h-5" /> Logout
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary h-10 w-10 p-2">
            <LogOutIcon className="h-5 w-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Disconnect your wallet ?</AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col gap-2 mt-5">
            <p className="text-sm font-bold">This will permanently disconnect your wallet.</p>
            <p className="text-sm">Please make sure your secured your passphrase to be able to recover your funds later.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="default" className="hover:cursor-pointer" onClick={() => onLogout()}>Disconnect</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
