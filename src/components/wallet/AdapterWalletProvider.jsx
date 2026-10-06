import React from 'react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';

const wallets = [];
const config = {
  autoConnect: false,
  env: 'mainnet-beta',
  theme: 'dark',
  lang: 'en',
  metadata: {
    name: 'VINmint',
    description: 'Vehicle identity on Solana',
    url: window.self !== window.top ? 'https://vinmint.base44.app' : window.location.origin,
    iconUrls: ['https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/c79eaab17_493130015_122093779586861598_4848437929607844438_n.jpg'],
  },
};

export default function AdapterWalletProvider({ children }) {
  return (
    <UnifiedWalletProvider wallets={wallets} config={config} localStorageKey="vinmint_adapter_wallet">
      {children}
    </UnifiedWalletProvider>
  );
}