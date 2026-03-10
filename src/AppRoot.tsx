import { useEffect, useState } from 'react'
import './App.css'
import App from './App.tsx'
import { Auth } from './Auth.tsx'
import { SiteHeader } from '@/components/app/site-header.tsx'
import { useWallet } from './hooks/use-wallet.tsx'
import { Spinner } from "@/components/ui/spinner"

export const AppRoot = () => {
  const { wallet, walletExists } = useWallet()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (walletExists) {
      setConnected(true)
    }
    else {
      setConnected(false)
    }
  }, [walletExists])

  // show spinner while wallet check / effect is running
  if (((walletExists || wallet) && !connected)) {
    return (
      <div className='flex text-primary items-center justify-center h-screen'>
        <Spinner className='size-8' />
      </div>
    )
  }

  if ((!wallet && !connected)) {
    console.log('auth', wallet, connected)
    return <Auth />
  }

  return (
    <div className='@container/main h-full bg-slate-50 '>
      <div className='bg-white px-3 md:px-[2rem] py-5 border-b-5 border-primary/40'>
        <div className='lg:mx-auto md:w-[90%]'><SiteHeader /></div>
      </div>
      <div className="lg:mx-auto md:w-[90%] min-h-screen py-10 px-3 md:px-[2rem] flex flex-col">
        <App />
      </div>
    </div>
  )
}