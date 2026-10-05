import React, { useState, useEffect, useCallback } from 'react';
import { purchaseVinTokens } from '@/functions/purchaseVinTokens.js';
import { getWalletBalance } from '@/functions/getWalletBalance.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, ArrowRight, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';

const SolanaLogo = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none" className="w-5 h-5 inline-block">
    <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#sol-buy-grad)" />
    <defs><linearGradient id="sol-buy-grad" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
  </svg>
);

const VinTokenLogo = () => (
  <img
    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg"
    alt="VIN"
    className="w-5 h-5 rounded-full inline-block"
  />
);

export default function BuyVinModal({ isOpen, onClose, walletAddress, onPurchaseSuccess }) {
  const [rate, setRate] = useState(0);
  const [vaultAddress, setVaultAddress] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [solAmount, setSolAmount] = useState('');
  const [solBalance, setSolBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const fetchRate = useCallback(async () => {
    try {
      const res = await purchaseVinTokens({ action: 'getRate' });
      if (res.data?.success) {
        setRate(res.data.rate || 0);
        setVaultAddress(res.data.vaultAddress || '');
        setIsConfigured(res.data.isConfigured);
      }
    } catch (e) {
      setError('Failed to load exchange rate.');
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await getWalletBalance({ walletAddress });
      if (res.data?.success) {
        setSolBalance(res.data.solBalance || 0);
      }
    } catch (e) {
      // ignore
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen) {
      fetchRate();
      fetchBalance();
      setError('');
      setSuccess(null);
      setSolAmount('');
    }
  }, [isOpen, fetchRate, fetchBalance]);

  const numericSol = parseFloat(solAmount) || 0;
  const vinToReceive = numericSol * rate;

  const handleBuy = async () => {
    setError('');
    setSuccess(null);

    if (numericSol <= 0) {
      setError('Enter a valid SOL amount.');
      return;
    }
    if (!isConfigured) {
      setError('Purchase is not available. Please contact an admin.');
      return;
    }
    if (solBalance < numericSol + 0.01) {
      setError(`Insufficient SOL. You need at least ${(numericSol + 0.01).toFixed(4)} SOL (including fees) but have ${solBalance.toFixed(4)} SOL.`);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await purchaseVinTokens({ action: 'purchase', solAmount: numericSol });
      if (res.data?.success) {
        setSuccess({
          vinAmount: res.data.vinAmount,
          solAmount: res.data.solAmount,
          signature: res.data.vinSignature,
          solscanUrl: res.data.solscanUrl,
        });
        if (onPurchaseSuccess) onPurchaseSuccess();
      } else {
        setError(res.data?.error || 'Purchase failed. Please try again.');
      }
    } catch (e) {
      setError(e.message || 'Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-purple-500/40 text-white max-w-[95vw] sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" />
            Buy VIN Tokens
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-1">
            Send SOL to the vault and receive VIN tokens automatically.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center text-center p-6 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-1">Purchase Successful!</h3>
              <p className="text-green-300 text-lg">
                You received {success.vinAmount.toLocaleString()} VIN
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Paid {success.solAmount} SOL
              </p>
            </div>
            <a
              href={success.solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View transaction on Solscan
            </a>
            <Button onClick={onClose} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Exchange rate display */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2">
                <SolanaLogo />
                <span className="text-slate-300 text-sm">1 SOL</span>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400" />
              <div className="flex items-center gap-2">
                <VinTokenLogo />
                <span className="text-white font-semibold">
                  {rate > 0 ? rate.toLocaleString() : '—'} VIN
                </span>
              </div>
            </div>

            {!isConfigured && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Token purchases are not yet available. An admin needs to configure the exchange rate.
                </AlertDescription>
              </Alert>
            )}

            {/* SOL amount input */}
            <div>
              <Label className="text-purple-300">Amount of SOL to spend</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                className="mt-2 bg-slate-800/50 border-purple-500/30 text-white text-lg"
                placeholder="0.05"
                disabled={isProcessing || !isConfigured}
              />
              <p className="text-slate-500 text-xs mt-1">
                Available: {solBalance.toFixed(6)} SOL
              </p>
            </div>

            {/* You receive preview */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">You will receive</span>
                <div className="flex items-center gap-2">
                  <VinTokenLogo />
                  <span className="text-2xl font-bold text-white">
                    {vinToReceive > 0 ? vinToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </span>
                  <span className="text-purple-300">VIN</span>
                </div>
              </div>
            </div>

            {vaultAddress && (
              <div className="text-xs text-slate-500">
                Vault: <span className="font-mono">{vaultAddress.substring(0, 8)}...{vaultAddress.substring(-6)}</span>
              </div>
            )}

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                onClick={handleBuy}
                disabled={isProcessing || !isConfigured || numericSol <= 0}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-12 text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing purchase...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Buy {vinToReceive > 0 ? vinToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''} VIN
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}