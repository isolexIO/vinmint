import { useEffect } from 'react';
import { useWallet } from '@/lib/WalletContext';
import { getInjectedProvider } from '@/components/wallet/mobileWalletConnection';

export default function MobileWalletHandoff({ onError }) {
  const { isConnected, connectPhantom, connectSolflare, connectBackpack } = useWallet();
  useEffect(() => {
    const url = new URL(window.location.href);
    const type = url.searchParams.get('connectWallet');
    const methods = { phantom: connectPhantom, solflare: connectSolflare, backpack: connectBackpack };
    if (!['phantom', 'solflare', 'backpack'].includes(type) || isConnected) return;
    let stopped = false;
    let timer;
    const deadline = Date.now() + 10000;
    const finishHandoff = () => {
      url.searchParams.delete('connectWallet');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    };
    const waitForWallet = () => {
      if (stopped) return;
      if (getInjectedProvider(type)) {
        finishHandoff();
        methods[type]().catch((error) => { if (!stopped) onError(error.message); });
      } else if (Date.now() < deadline) {
        timer = window.setTimeout(waitForWallet, 100);
      } else {
        finishHandoff();
        onError('Open VINmint in your wallet app’s browser, then tap your wallet to approve the connection.');
      }
    };
    waitForWallet();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [isConnected, connectPhantom, connectSolflare, connectBackpack, onError]);
  return null;
}