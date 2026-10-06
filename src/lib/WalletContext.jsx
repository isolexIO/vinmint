import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Keypair } from '@solana/web3.js';
import { useUnifiedWallet } from '@jup-ag/wallet-adapter';
import getAdapterWallet from '@/components/wallet/getAdapterWallet';
import mobileWalletConnection, { getInjectedProvider, isMobile } from '@/components/wallet/mobileWalletConnection';

const WalletContext = createContext(null);
const STORAGE_KEY = 'vinmint_wallet_session';
const GENERATED_STORAGE_KEY = 'vinmint_generated_wallet';

export function WalletProvider({ children }) {
  const { wallets: adapterWallets } = useUnifiedWallet();
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [autoKeypair, setAutoKeypair] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState(null);

  // Restore session and reconnect trusted external wallets
  useEffect(() => {
    try {
      const generated = localStorage.getItem(GENERATED_STORAGE_KEY);
      if (generated) setAutoKeypair(Keypair.fromSecretKey(Uint8Array.from(JSON.parse(generated))));
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const session = JSON.parse(saved);
      setWalletAddress(session.address);
      setWalletType(session.type);
      if (session.type === 'auto' && session.secretKey) {
        setAutoKeypair(Keypair.fromSecretKey(Uint8Array.from(session.secretKey)));
        localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(session.secretKey));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: session.address, type: session.type }));
      }
      // Reconnect external wallet silently if trusted
      if (session.type === 'phantom') {
        const p = getInjectedProvider('phantom');
        if (p) p.connect({ onlyIfTrusted: true }).then(res => {
          setWalletAddress(res.publicKey.toString());
        }).catch(() => {});
      }
      if (session.type === 'solflare') {
        const p = getInjectedProvider('solflare');
        if (p) p.connect().then(() => {
          setWalletAddress(p.publicKey.toString());
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to restore wallet session:', e);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const saveSession = (address, type, secretKey = null) => {
    const session = { address, type };
    if (secretKey) localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(secretKey));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const withTimeout = (promise, ms, msg) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
    ]);

  const connectExternalWallet = useCallback(async (type) => {
    setIsConnecting(true);
    setError(null);
    try {
      const provider = getInjectedProvider(type);
      if (!provider) {
        if (isMobile) {
          window.location.assign(mobileWalletConnection(type));
          return;
        }
        const labels = { phantom: 'Phantom', solflare: 'Solflare', backpack: 'Backpack' };
        throw new Error(`${labels[type]} was not detected in this browser. Open VINmint inside the ${labels[type]} app on mobile, or install the ${labels[type]} extension on desktop, then try again.`);
      }
      const result = await withTimeout(
        provider.connect(),
        30000,
        'The wallet did not respond in time. Please approve the connection prompt in your wallet, or try again.'
      );
      const publicKey = result?.publicKey || provider.publicKey;
      if (!publicKey) throw new Error('The wallet did not approve the connection. Please try again.');
      const address = publicKey.toString();
      saveSession(address, type);
      setWalletAddress(address);
      setWalletType(type);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectPhantom = useCallback(() => connectExternalWallet('phantom'), [connectExternalWallet]);
  const connectSolflare = useCallback(() => connectExternalWallet('solflare'), [connectExternalWallet]);
  const connectBackpack = useCallback(() => connectExternalWallet('backpack'), [connectExternalWallet]);

  const connectAdapterWallet = useCallback(async (type) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (type === 'mwa' && !/Android/i.test(navigator.userAgent)) {
        throw new Error('Mobile Wallet Adapter requires a supported Android browser and an installed compatible wallet. On iPhone, choose Phantom, Solflare, or Backpack.');
      }
      const adapter = getAdapterWallet(adapterWallets, type);
      if (!adapter || ['NotDetected', 'Unsupported'].includes(adapter.readyState)) {
        throw new Error(type === 'jupiter'
          ? 'Install the Jupiter Wallet browser extension, then reload this page to connect. Jupiter Mobile QR connections require a separate WalletConnect setup.'
          : 'Open VINmint in Chrome on Android with an MWA-compatible wallet installed, then try again.');
      }
      await withTimeout(
        adapter.connect(),
        30000,
        'The wallet did not respond in time. Approve the connection prompt in your wallet, or try again.'
      );
      if (!adapter.publicKey) throw new Error('The wallet did not approve the connection. Please try again.');
      const address = adapter.publicKey.toString();
      saveSession(address, type);
      setWalletAddress(address);
      setWalletType(type);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [adapterWallets]);

  useEffect(() => {
    const adapter = getAdapterWallet(adapterWallets, walletType);
    if (!adapter) return;
    const handleConnect = (publicKey) => {
      const address = publicKey.toString();
      saveSession(address, walletType);
      setWalletAddress(address);
    };
    const handleDisconnect = () => {
      setWalletAddress(null);
      setWalletType(null);
      localStorage.removeItem(STORAGE_KEY);
    };
    adapter.on('connect', handleConnect);
    adapter.on('disconnect', handleDisconnect);
    return () => {
      adapter.off('connect', handleConnect);
      adapter.off('disconnect', handleDisconnect);
    };
  }, [adapterWallets, walletType]);

  const generateAutoWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Generate a standard Solana keypair instantly. (A "VIN" vanity prefix is
      // impossible in base58 — the character "I" is excluded from the alphabet —
      // so any vanity loop would hang forever. We generate a normal address.)
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      setAutoKeypair(keypair);
      // Persist the generated keypair independently so it survives reloads.
      localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(Array.from(keypair.secretKey)));
      // Only switch the active session to the auto wallet when no external wallet is connected.
      if (!walletAddress) {
        setWalletAddress(address);
        setWalletType('auto');
        saveSession(address, 'auto', Array.from(keypair.secretKey));
      }
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [walletAddress]);

  const clearAutoWallet = useCallback(async () => {
    setAutoKeypair(null);
    localStorage.removeItem(GENERATED_STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.type === 'auto') localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    if (walletType === 'auto') {
      setWalletAddress(null);
      setWalletType(null);
    }
  }, [walletType]);

  const disconnect = useCallback(async () => {
    const provider = getAdapterWallet(adapterWallets, walletType) || getInjectedProvider(walletType);
    setWalletAddress(null);
    setWalletType(null);
    localStorage.removeItem(STORAGE_KEY);
    try {
      if (provider && provider.disconnect) await provider.disconnect();
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  }, [walletType, adapterWallets]);

  const signTransaction = useCallback(async (transaction) => {
    if (walletType === 'mwa' || walletType === 'jupiter') {
      const adapter = getAdapterWallet(adapterWallets, walletType);
      if (!adapter) throw new Error('Reconnect your wallet to sign this transaction.');
      if (!adapter.connected) await adapter.connect();
      if (!adapter.signTransaction) throw new Error('This wallet does not support signing transactions.');
      return await adapter.signTransaction(transaction);
    }
    if (['phantom', 'solflare', 'backpack'].includes(walletType)) {
      const p = getInjectedProvider(walletType);
      if (p && p.signTransaction) return await p.signTransaction(transaction);
    }
    throw new Error('Transaction signing is not supported for this wallet.');
  }, [walletType, adapterWallets]);

  const signMessage = useCallback(async (message) => {
    const encoded = new TextEncoder().encode(message);
    if (walletType === 'mwa' || walletType === 'jupiter') {
      const adapter = getAdapterWallet(adapterWallets, walletType);
      if (!adapter) throw new Error('Reconnect your wallet to sign this message.');
      if (!adapter.connected) await adapter.connect();
      if (!adapter.signMessage) throw new Error('This wallet does not support message signing.');
      return { signature: await adapter.signMessage(encoded), publicKey: adapter.publicKey };
    }
    if (walletType === 'phantom') {
      const p = getInjectedProvider('phantom');
      if (p) return await p.signMessage(encoded, 'utf8');
    }
    if (walletType === 'solflare') {
      const p = getInjectedProvider('solflare');
      if (p) return await p.signMessage(encoded, 'utf8');
    }
    if (walletType === 'backpack') {
      const p = getInjectedProvider('backpack');
      if (p) return await p.signMessage(encoded, 'utf8');
    }
    if (walletType === 'auto' && autoKeypair) {
      throw new Error('Message signing is not supported for auto-generated wallets. Connect an external wallet to sign.');
    }
    throw new Error('No wallet connected or signing not supported');
  }, [walletType, autoKeypair, adapterWallets]);

  const value = {
    walletAddress,
    walletType,
    autoKeypair,
    isConnecting,
    isRestoring,
    error,
    isConnected: !!walletAddress,
    isMobile,
    connectPhantom,
    connectSolflare,
    connectBackpack,
    connectAdapterWallet,
    generateAutoWallet,
    clearAutoWallet,
    disconnect,
    signMessage,
    signTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}