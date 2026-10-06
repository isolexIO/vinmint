import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Keypair } from '@solana/web3.js';

const WalletContext = createContext(null);
const STORAGE_KEY = 'vinmint_wallet_session';

const isMobile = typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function getInjectedProvider(type) {
  if (typeof window === 'undefined') return null;
  if (type === 'phantom') return window.solana?.isPhantom ? window.solana : null;
  if (type === 'solflare') return window.solflare?.isSolflare ? window.solflare : null;
  if (type === 'backpack') return window.backpack ? window.backpack : null;
  return null;
}

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

  const connectPhantom = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      let provider = getInjectedProvider('phantom');
      if (!provider) {
        if (isMobile) {
          window.location.href = `https://phantom.app/ul/v1/browse?url=${encodeURIComponent(window.location.href)}`;
          return;
        }
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom not found. Install the Phantom extension.');
      }
      const res = await provider.connect();
      const address = res.publicKey.toString();
      setWalletAddress(address);
      setWalletType('phantom');
      saveSession(address, 'phantom');
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectSolflare = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      let provider = getInjectedProvider('solflare');
      if (!provider) {
        if (isMobile) {
          window.location.href = `https://solflare.com/ul/v1/browse?url=${encodeURIComponent(window.location.href)}`;
          return;
        }
        window.open('https://solflare.com/', '_blank');
        throw new Error('Solflare not found. Install Solflare.');
      }
      await provider.connect();
      const address = provider.publicKey.toString();
      setWalletAddress(address);
      setWalletType('solflare');
      saveSession(address, 'solflare');
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectBackpack = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      let provider = getInjectedProvider('backpack');
      if (!provider) {
        window.open('https://backpack.app/', '_blank');
        throw new Error('Backpack not found. Install Backpack.');
      }
      await provider.connect();
      const address = provider.publicKey.toString();
      setWalletAddress(address);
      setWalletType('backpack');
      saveSession(address, 'backpack');
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, []);

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