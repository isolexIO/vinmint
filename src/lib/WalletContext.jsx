import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Keypair } from '@solana/web3.js';
import mobileWalletConnection, { getInjectedProvider, isMobile } from '@/components/wallet/mobileWalletConnection';

const WalletContext = createContext(null);
const STORAGE_KEY = 'vinmint_wallet_session';

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [autoKeypair, setAutoKeypair] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Restore session and reconnect trusted external wallets
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const session = JSON.parse(saved);
      setWalletAddress(session.address);
      setWalletType(session.type);
      if (session.type === 'auto' && session.secretKey) {
        setAutoKeypair(Keypair.fromSecretKey(Uint8Array.from(session.secretKey)));
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
    }
  }, []);

  const saveSession = (address, type, secretKey = null) => {
    const session = { address, type };
    if (secretKey) session.secretKey = secretKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

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
        const sites = { phantom: 'https://phantom.com/', solflare: 'https://solflare.com/', backpack: 'https://backpack.app/' };
        window.open(sites[type], '_blank', 'noopener,noreferrer');
        throw new Error(`${labels[type]} not found. Install its browser extension, then try again.`);
      }
      const result = await provider.connect();
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

  const generateAutoWallet = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    try {
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      setAutoKeypair(keypair);
      setWalletAddress(address);
      setWalletType('auto');
      saveSession(address, 'auto', Array.from(keypair.secretKey));
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      const provider = getInjectedProvider(walletType);
      if (provider && provider.disconnect) provider.disconnect();
    } catch (e) {
      console.error('Disconnect error:', e);
    }
    setWalletAddress(null);
    setWalletType(null);
    setAutoKeypair(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [walletType]);

  const signMessage = useCallback(async (message) => {
    const encoded = new TextEncoder().encode(message);
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
  }, [walletType, autoKeypair]);

  const value = {
    walletAddress,
    walletType,
    autoKeypair,
    isConnecting,
    error,
    isConnected: !!walletAddress,
    isMobile,
    connectPhantom,
    connectSolflare,
    connectBackpack,
    generateAutoWallet,
    disconnect,
    signMessage,
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