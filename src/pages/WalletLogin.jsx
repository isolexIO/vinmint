import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useWallet } from '@/lib/WalletContext';
import useWalletLoginRedirect from '@/components/wallet/useWalletLoginRedirect';
import MobileWalletHandoff from '@/components/wallet/MobileWalletHandoff';
import AdapterWalletOptions from '@/components/wallet/AdapterWalletOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Plus, ArrowRight, AlertCircle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const PhantomIcon = () => (
  <svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978Z" fill="url(#phantom-grad)"/>
    <defs><linearGradient id="phantom-grad" x1="31" y1="64" x2="104" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#5F72F7"/><stop offset="1" stopColor="#AB9CFF"/></linearGradient></defs>
  </svg>
);

const SolflareIcon = () => (
  <svg width="32" height="32" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="128" cy="128" r="100" fill="#F08736"/>
    <path d="M128 48 L128 208 M48 128 L208 128" stroke="#fff" strokeWidth="16" strokeLinecap="round" opacity="0.4"/>
    <circle cx="128" cy="128" r="40" fill="#fff"/>
  </svg>
);

const BackpackIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="16" height="16" rx="4" fill="#D9A5BB"/>
    <path d="M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default function WalletLogin() {
  const {
    isConnected, walletAddress, walletType, isConnecting, error, isMobile,
    connectPhantom, connectSolflare, connectBackpack, connectAdapterWallet, generateAutoWallet, disconnect,
  } = useWallet();
  const [localError, setLocalError] = useState(null);
  const { continueLogin, isFinishing } = useWalletLoginRedirect(setLocalError);

  const handleConnect = async (method) => {
    setLocalError(null);
    try {
      if (method === 'phantom') await connectPhantom();
      else if (method === 'solflare') await connectSolflare();
      else if (method === 'backpack') await connectBackpack();
      else if (method === 'mwa' || method === 'jupiter') await connectAdapterWallet(method);
      else if (method === 'auto') await generateAutoWallet();
    } catch (e) {
      setLocalError(e.message);
    }
  };



  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <MobileWalletHandoff onError={setLocalError} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Connect Wallet
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Sign in to VINmint with your Solana wallet
          </p>
        </div>

        {isConnected ? (
          <Card className="bg-slate-800/50 border-green-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-green-400 font-semibold mb-2">Wallet Connected</p>
              <p className="text-slate-400 text-sm font-mono break-all mb-4">
                {walletAddress}
              </p>
              <p className="text-slate-500 text-xs mb-4">Type: {walletType}</p>
              {displayError && <p role="alert" className="text-destructive text-sm mb-4">{displayError}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={continueLogin}
                  disabled={isFinishing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
                >
                  {isFinishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Finishing sign-in...</> : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
                <Button
                  onClick={disconnect}
                  disabled={isFinishing}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-300 text-sm">{displayError}</p>
              </div>
            )}

            <div className="space-y-3">
              {/* Phantom */}
              <button
                onClick={() => handleConnect('phantom')}
                disabled={isConnecting}
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-purple-500/20 hover:border-purple-500/50 backdrop-blur-xl flex items-center gap-4 transition-all duration-200 hover:bg-slate-800/80 disabled:opacity-50"
              >
                <PhantomIcon />
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">Phantom</p>
                  <p className="text-slate-400 text-xs">
                    {isMobile ? 'Opens in Phantom browser' : 'Browser extension'}
                  </p>
                </div>
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <ArrowRight className="w-5 h-5 text-slate-500" />}
              </button>

              {/* Solflare */}
              <button
                onClick={() => handleConnect('solflare')}
                disabled={isConnecting}
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-purple-500/20 hover:border-purple-500/50 backdrop-blur-xl flex items-center gap-4 transition-all duration-200 hover:bg-slate-800/80 disabled:opacity-50"
              >
                <SolflareIcon />
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">Solflare</p>
                  <p className="text-slate-400 text-xs">
                    {isMobile ? 'Opens in Solflare browser' : 'Browser extension'}
                  </p>
                </div>
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <ArrowRight className="w-5 h-5 text-slate-500" />}
              </button>

              {/* Backpack */}
              <button
                onClick={() => handleConnect('backpack')}
                disabled={isConnecting}
                className="w-full p-4 rounded-xl bg-slate-800/50 border border-purple-500/20 hover:border-purple-500/50 backdrop-blur-xl flex items-center gap-4 transition-all duration-200 hover:bg-slate-800/80 disabled:opacity-50"
              >
                <BackpackIcon />
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">Backpack</p>
                  <p className="text-slate-400 text-xs">{isMobile ? 'Opens in Backpack browser' : 'Browser extension'}</p>
                </div>
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <ArrowRight className="w-5 h-5 text-slate-500" />}
              </button>

              <AdapterWalletOptions onConnect={handleConnect} isConnecting={isConnecting} />

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs">OR</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* Auto-generated */}
              <button
                onClick={() => handleConnect('auto')}
                disabled={isConnecting}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/40 hover:border-purple-400/60 backdrop-blur-xl flex items-center gap-4 transition-all duration-200 disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">Generate New Wallet</p>
                  <p className="text-slate-400 text-xs">Create a non-custodial wallet instantly</p>
                </div>
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <ArrowRight className="w-5 h-5 text-slate-500" />}
              </button>
            </div>

            {isMobile && (
              <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-300 text-xs">
                  Mobile Wallet Adapter connects compatible wallets from a supported Android browser. Phantom, Solflare, and Backpack open their own browsers; continue using VINmint there.
                </p>
              </div>
            )}

            <p className="text-center text-slate-500 text-xs mt-6">
              By connecting, you agree to our{' '}
              <Link to={createPageUrl('TermsOfUse')} className="text-purple-400 hover:text-purple-300">Terms</Link>
              {' '}and{' '}
              <Link to={createPageUrl('PrivacyPolicy')} className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
            </p>
          </>
        )}

        <div className="text-center mt-6">
          <Link to={createPageUrl('Home')} className="text-slate-400 hover:text-white text-sm">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}