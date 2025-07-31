import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css';

import '@rainbow-me/rainbowkit/styles.css';

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { phantomWallet } from '@rainbow-me/rainbowkit/wallets';

import { WagmiProvider, http } from "wagmi";
import { monadTestnet} from "wagmi/chains";

const wagmiConfig = getDefaultConfig({
  wallets: [    {
    groupName: 'Recommended',
    wallets: [phantomWallet],
  },],
  appName: 'Monad Place',
  projectId: 'Monad Place',
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
})

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
