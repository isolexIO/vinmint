import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const shorten = address => address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Unavailable';

export default function WalletSwitcher({ activeWallet, onSelect, vinmintWallet, connectedWallet, hasAccount, onSignIn, onCreate, isGenerating }) {
  if (!connectedWallet) return null;
  const sameWallet = vinmintWallet === connectedWallet;
  const choices = [
    { id: 'vinmint', label: 'VINmint Wallet', address: vinmintWallet, Icon: Wallet, disabled: !vinmintWallet },
    { id: 'connected', label: 'Connected Wallet', address: connectedWallet, Icon: Zap, disabled: sameWallet },
  ];
  return (
    <div className="mb-6">
      <div role="group" aria-label="Select wallet" className="rounded-xl bg-slate-800/50 border border-purple-500/20 backdrop-blur-xl p-1.5 flex gap-1">
        {choices.map(({ id, label, address, Icon, disabled }) => (
          <button key={id} type="button" disabled={disabled} aria-pressed={activeWallet === id}
            onClick={() => onSelect(id)}
            className={`min-w-0 flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${activeWallet === id ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-purple-500/10'}`}>
            <span className="flex items-center justify-center gap-1"><Icon className="w-4 h-4 shrink-0" />{label}</span>
            <span className="font-mono text-xs">{shorten(address)}</span>
          </button>
        ))}
      </div>
      <div className="text-slate-400 text-xs mt-2 text-center">
        {!vinmintWallet ? (
          <>
            <p className="mb-2">{hasAccount ? 'Create a VINmint wallet to switch between two wallets.' : 'Sign in to load the VINmint wallet saved on your account.'}</p>
            <Button size="sm" disabled={isGenerating} onClick={hasAccount ? onCreate : onSignIn}
              className={hasAccount
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'}>
              {hasAccount ? (isGenerating ? 'Creating Wallet...' : 'Create VINmint Wallet') : 'Sign In to Access My Wallet'}
            </Button>
          </>
        ) : sameWallet ? (
          <p>Both connections use the same address. Connect a different external wallet to switch wallets.</p>
        ) : (
          <p>Purchases use your VINmint wallet. Use “Transfer Between Wallets” to fund it.</p>
        )}
      </div>
    </div>
  );
}