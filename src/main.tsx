import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Root } from './Root'
import initBreezSDK from '@breeztech/breez-sdk-spark/web';

async function init() {

  // Initialise the WebAssembly module
  await initBreezSDK();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>
  )

}

init()