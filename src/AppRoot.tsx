import { useEffect, useState } from 'react'
import './App.css'
import App from './App.tsx'
import { Auth } from './Auth.tsx'
import { SiteHeader } from '@/components/app/site-header.tsx'
import { useWallet } from './hooks/use-wallet.tsx'
import { Spinner } from "@/components/ui/spinner"

import LogoPng from '../public/logo.svg'
import { getStatus } from './lib/api.ts'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert.tsx'
import { AlertTriangle } from 'lucide-react'

export const AppRoot = () => {
  const [initializing, setInitializing] = useState(true)
  const [errorStatus, setErrorStatus] = useState<string | undefined>(undefined)

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

  useEffect(() => {
    if (wallet) {
      getStatus()
        .then(async ({ sparkStatus }) => {
          if (sparkStatus == 'operational') {
            setErrorStatus(undefined)
            setInitializing(false)
          }
          else {
            setErrorStatus(`Spark status is not operational. Please retry in few moments. We are sorry for this inconvenience.`)
          }
        })
        .catch(async (e) => {
          console.log(e)
          setErrorStatus('An error occured. Please retry in few moments. We are sorry for this inconvenience.')
        })
    }

  }, [wallet])

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
                {!errorStatus && <Spinner className='size-5' />}
                {!errorStatus && <p className='mt-10 text-primary font-mono uppercase text-xs animate-[bounce_0.8s_ease-in-out_infinite]'>wallet sync...</p>}
              </div>

              {errorStatus && <Alert className="text-primary bg-primary/10 border-1 border-primary/20">
                <AlertTriangle />
                <AlertTitle className="font-semibold">Networking issue</AlertTitle>
                <AlertDescription className="flex flex-col gap-5 text-foreground">
                  {errorStatus}
                </AlertDescription>
              </Alert>}
            </div>
          </div>
        </div>
      }
    </>
  )
}