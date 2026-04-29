import { useEffect, useState } from 'react'
import './App.css'
import App from './App.tsx'
import { Auth } from './Auth.tsx'
import { SiteHeader } from '@/components/dashboard/site-header.tsx'
import { useWallet } from './hooks/use-wallet.tsx'
import { useSettings } from './hooks/use-settings.tsx'

import LogoPng from '../public/logo.svg'

export const AppRoot = () => {
  const [initializing, setInitializing] = useState(true)

  const { wallet, walletExists } = useWallet()
  const { loading } = useSettings()
  const [connected, setConnected] = useState(false)
  const [progressLoadingText, setProgressLoadingText] = useState(".")

  useEffect(() => {
    if (walletExists) {
      setConnected(true)
    }
    else {
      setConnected(false)
    }
  }, [walletExists])

  useEffect(() => {
    if (!loading) {
      new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
        setProgressLoadingText("..")
        if (wallet) {
          setConnected(true)
          setProgressLoadingText("...")
          new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            setInitializing(false)
          })
        }
      })
    }
  }, [loading, wallet])

  if ((!wallet && !connected)) {
    console.log('auth', wallet, connected)
    return <Auth />
  }

  return (
    <>
      {!initializing &&
        <div className='@container/main h-full bg-slate-50 '>
          <div className='bg-white px-3 md:px-[2rem] py-5 border-b-5 border-primary/40'>
            <div className='lg:mx-auto md:w-[90%]'><SiteHeader /></div>
          </div>
          <div className="lg:mx-auto md:w-[90%] min-h-screen py-10 px-3 md:px-[2rem] flex flex-col">
            <App />
          </div>
        </div>
      }
      {initializing &&
        <div className="bg-gray-50 h-screen">
          <div className="lg:max-w-2xl mx-auto">
            <div className="flex h-screen flex-col gap-10 justify-center">
              <div className='flex flex-col items-center gap-2'>
                <img src={LogoPng} className='w-10' />
                <div className='font-serif text-4xl tracking-tight text-foreground flex items-center'>
                  <span className='text-primary'>bit</span>
                  lasso
                </div>
                <p className='mt-10 text-primary text-lg'>Initializing {progressLoadingText}</p>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  )
}