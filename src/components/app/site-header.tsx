import { IconDashboard, IconSettings2, type Icon } from "@tabler/icons-react"
import { Link, useLocation, useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { shortenAddress } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, MoreVertical } from "lucide-react"
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

  const [status, setStatus] = useState<undefined | { status: string, active: boolean }>({ status: 'operational', active: true })
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
    localStorage.removeItem('BITLASSO_NOSTRKEYPAIR')
    localStorage.removeItem('BITLASSO_MNEMONIC')
    localStorage.removeItem('BITLASSO_SESSION_TOKEN')
    localStorage.removeItem('BITLASSO_SESSION_EXPIRES_AT')
    navigate('/', { replace: true })
  }

  const [open, setOpen] = useState(false)

  return (
    // <header className="flex px-5 lg:px-10 h-15 shrink-0 items-center gap-2 border-b border-primary/80 border-b-5 bg-white">
    //   <div className="flex w-full items-center gap-1">
    //     <div className="flex justify-between items-center w-full">
    //       <div className='flex gap-10'>
    //         <h1 className="">
    //           <div className='flex items-center gap-2 text-1xl'>
    //             <img src={LogoPng} className='w-10' />
    //             <p className="flex gap-2 items-end font-serif tracking-tighter text-foreground">
    //               <span className="text-3xl"><Link to='/'>loop</Link></span>
    //               <span className="text-xs flex gap-1 relative items-center">by <a href='https://hexquarter.com' className="font-[Cal_Sans] tracking-normal" target="_blank"><span className="text-primary">H</span>ex<span className="text-primary">Q</span>uarter</a></span>
    //             </p>
    //           </div>
    //         </h1>
    //         <nav className="flex gap-4 text-sm items-center">
    //           {menuItems.filter(i => i.visible).map((item: NavItemType, index: number) => (
    //             <div onClick={() => navigate(item.url)} key={index} className={`flex ${item.selected ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'} cursor-pointer items-center gap-1`} >
    //               {item.icon && <item.icon className="h-5" />}
    //               <span>{item.title}</span>
    //             </div>
    //           ))}
    //         </nav>
    //       </div>
    //       {wallet &&
    //         <div>
    //           <div className="flex text-xs items-center gap-2 text-gray-500 hidden sm:flex">
    //             <DropdownMenu>
    //               <DropdownMenuTrigger asChild>
    //                 <Button variant='ghost' className="text-xs rounded-full">{shortenAddress(sparkAddress)} <MoreVertical /></Button>
    //               </DropdownMenuTrigger>
    //               <DropdownMenuContent align="end">
    //                 {/* <DropdownMenuLabel>Actions</DropdownMenuLabel>
    //               <DropdownMenuSeparator /> */}
    //                 <DropdownMenuItem className="text-xs focus:text-primary focus:bg-primary/10 h-8" onClick={logout} >
    //                   Logout
    //                 </DropdownMenuItem>
    //               </DropdownMenuContent>
    //             </DropdownMenu>

    //             {status &&
    //               <Tooltip>
    //                 <TooltipTrigger><div className={`${status.active ? 'bg-green-400' : 'bg-primary'} rounded-full w-2 h-2`}></div></TooltipTrigger>
    //                 <TooltipContent className="flex flex-col gap-2">
    //                   <p>Connected to Spark</p>
    //                   <p>Status: {status.status}</p>
    //                 </TooltipContent>
    //               </Tooltip>
    //             }
    //           </div>

    //           <div className="sm:hidden w-full">
    //             <Collapsible open={open} onOpenChange={setOpen}>
    //               <CollapsibleTrigger asChild>
    //                 <ChevronDown
    //                   size={14}
    //                   className={`transition-transform ${open ? "rotate-180" : ""}`}
    //                 />
    //               </CollapsibleTrigger>

    //               <CollapsibleContent className="absolute top-12 p-5 right-0 border rounded-md flex flex-col gap-5 bg-white border-primary/20 text-xs">
    //                 <p className="text-primary">{shortenAddress(sparkAddress)}</p>

    //                 <button
    //                   onClick={logout}
    //                   className="w-full text-left hover:bg-primary/10"
    //                 >
    //                   Logout
    //                 </button>
    //               </CollapsibleContent>
    //             </Collapsible>
    //           </div>
    //         </div>
    //       }
    //     </div>
    //   </div >
    // </header >

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
        <div className="flex items-center">
          {menuItems.map((m, i) => (
            <Link
              key={i}
              to={m.url}
              className={`flex items-center gap-1 ${m.selected ? 'text-primary' :''} rounded-full px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-primary hover:text-foreground`}
            >
              {m.icon && <m.icon className="h-5" />}
              {m.title}
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {wallet &&
          <div>
            <div className="flex text-xs items-center gap-2 text-gray-500 hidden sm:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className="text-xs rounded-full">{shortenAddress(sparkAddress)} <MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs focus:text-primary focus:bg-primary/10 h-8" onClick={logout} >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {status &&
                <Tooltip>
                  <TooltipTrigger><div className={`${status.active ? 'bg-green-400' : 'bg-primary'} rounded-full w-2 h-2`}></div></TooltipTrigger>
                  <TooltipContent className="flex flex-col gap-2">
                    <p>Connected to Spark</p>
                    <p>Status: {status.status}</p>
                  </TooltipContent>
                </Tooltip>
              }
            </div>

            <div className="sm:hidden w-full">
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="absolute top-12 p-5 right-0 border rounded-md flex flex-col gap-5 bg-white border-primary/20 text-xs">
                  <p className="text-primary">{shortenAddress(sparkAddress)}</p>

                  <button
                    onClick={logout}
                    className="w-full text-left hover:bg-primary/10"
                  >
                    Logout
                  </button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        }
      </div>



      {/* <Link
                        to="/app"
                        className="hidden rounded-full bg-foreground px-6 py-2 text-[13px] font-medium text-background transition-all duration-300 hover:opacity-85 md:inline-flex"
                    >
                        Open your loop
                    </Link> */}

      {/* <button
            className="flex items-center justify-center text-foreground md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-primary" />}
          </button> */}

      {/* {open && (
        <div className="mx-6 mt-2 rounded-2xl border border-border/40 bg-card/95 p-6 shadow-lg backdrop-blur-2xl sm:mx-10 md:hidden lg:mx-16">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )} */}
    </header>
  )
}
