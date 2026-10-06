import React, { useMemo } from 'react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';

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
  // Manually instantiate the Mobile Wallet Adapter so it is always available,
  // even when the library's environment detection skips MWA (e.g. inside the
  // Solana dApp Store review WebView). The library otherwise only auto-creates
  // this adapter on a non-WebView Android browser.
  const wallets = useMemo(() => {
    try {
      const mwa = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: { uri: window.location.origin },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'mainnet-beta',
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      });
      return [mwa];
    } catch (e) {
      console.error('Failed to instantiate Mobile Wallet Adapter:', e);
      return [];
    }
  }, []);

  return (
    <UnifiedWalletProvider wallets={wallets} config={config} localStorageKey="vinmint_adapter_wallet">
      {children}
    </UnifiedWalletProvider>
  );
}