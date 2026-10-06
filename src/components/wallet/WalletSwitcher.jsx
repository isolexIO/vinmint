import React from 'react';
import { Wallet, Zap, PlusCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const shorten = address => address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Unavailable';

export default function WalletSwitcher({ activeWallet, onSelect, vinmintWallet, connectedWallet, hasAccount, onSignIn, onCreate, isGenerating }) {
  const navigate = useNavigate();
  const sameWallet = vinmintWallet && connectedWallet && vinmintWallet === connectedWallet;

  const slots = [
    {
      id: 'vinmint',
      label: 'VINmint Wallet',
      address: vinmintWallet,
      Icon: Wallet,
      empty: (
        <div className="flex flex-col items-center gap-1">
          <span className="flex items-center justify-center gap-1"><Wallet className="w-4 h-4 shrink-0" />VINmint Wallet</span>
          <span className="font-mono text-xs text-slate-400">Not created</span>
        </div>
      ),
    },
    {
      id: 'connected',
      label: 'Connected Wallet',
      address: connectedWallet,
      Icon: Zap,
      empty: (
        <button type="button" onClick={() => navigate('/WalletLogin?next=%2FWallet')}
          className="flex flex-col items-center gap-1 w-full">
          <span className="flex items-center justify-center gap-1"><Link2 className="w-4 h-4 shrink-0" />Connect Wallet</span>
          <span className="font-mono text-xs text-slate-400">Tap to connect</span>
        </button>
      ),
    },
  ];

  return (
    <div className="mb-6">
      <div role="group" aria-label="Select wallet" className="rounded-xl bg-slate-800/50 border border-purple-500/20 backdrop-blur-xl p-1.5 flex gap-1">
        {slots.map(({ id, label, address, Icon, empty }) => {
          const isActive = activeWallet === id;
          const disabled = id === 'connected' && sameWallet;
          return (
            <button key={id} type="button" disabled={disabled} aria-pressed={isActive}
              onClick={() => address && onSelect(id)}
              className={`min-w-0 flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-purple-500/10'}`}>
              {address ? (
                <>
                  <span className="flex items-center justify-center gap-1"><Icon className="w-4 h-4 shrink-0" />{label}</span>
                  <span className="font-mono text-xs">{shorten(address)}</span>
                </>
              ) : empty}
            </button>
          );
        })}
      </div>
      <div className="text-slate-400 text-xs mt-2 text-center">
        {!vinmintWallet ? (
          <>
            <p className="mb-2">
              {hasAccount
                ? 'Create a VINmint wallet to switch between two wallets.'
                : 'Generate a VINmint wallet on this device, no email or Google sign-in required.'}
            </p>
            <Button size="sm" disabled={isGenerating} onClick={onCreate}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500">
              <PlusCircle className="w-4 h-4 mr-2" />
              {isGenerating ? 'Creating Wallet...' : 'Create VINmint Wallet'}
            </Button>
          </>
        ) : !connectedWallet ? (
          <p>Connect an external Solana wallet to switch between it and your VINmint wallet.</p>
        ) : sameWallet ? (
          <p>Both connections use the same address. Connect a different external wallet to switch wallets.</p>
        ) : (
          <p>Purchases use your VINmint wallet. Use “Transfer Between Wallets” to fund it.</p>
        )}
      </div>
    </div>
  );
}