import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useWallet } from "@/lib/WalletContext";
import { transferTokens } from "@/functions/transferTokens.js";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// Shortens a wallet address for display
const shortAddr = (a) => a ? `${a.slice(0, 4)}...${a.slice(-4)}` : '';

export default function TransferBetweenWalletsModal({
  isOpen,
  onClose,
  vinmintWallet,
  connectedWallet,
  onSuccess
}) {
  const { signTransaction } = useWallet();
  // direction: 'fund' = Connected -> VINmint, 'withdraw' = VINmint -> Connected
  const [direction, setDirection] = useState('fund');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!vinmintWallet || !connectedWallet) return null;

  const reset = () => {
    setAmount('');
    setError('');
    setInfo('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = async () => {
    setError('');
    setInfo('');
    const solAmount = parseFloat(amount);
    if (!solAmount || solAmount <= 0) {
      setError('Enter a valid SOL amount.');
      return;
    }

    setIsSending(true);
    try {
      if (direction === 'fund') {
        // Connected -> VINmint: sign client-side with the external wallet
        setInfo('Preparing transaction...');
        const connection = new Connection(PUBLIC_RPC, 'confirmed');
        const fromPubkey = new PublicKey(connectedWallet);
        const toPubkey = new PublicKey(vinmintWallet);
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

        const transaction = new Transaction().add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
        );
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        setInfo('Please approve the transaction in your wallet...');
        const signed = await signTransaction(transaction);
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(sig, 'confirmed');
        setInfo(`Funded VINmint wallet. Signature: ${sig}`);
      } else {
        // VINmint -> Connected: use the backend (sends from the VINmint account wallet)
        setInfo('Sending from your VINmint wallet...');
        const response = await transferTokens({
          recipientAddress: connectedWallet,
          amount: solAmount,
          tokenType: 'SOL'
        });
        if (response.data && response.data.success) {
          setInfo(`Withdrawn to connected wallet. Signature: ${response.data.transaction_hash}`);
        } else {
          throw new Error(response.data?.error || 'Withdraw failed');
        }
      }

      reset();
      onSuccess && onSuccess();
      handleClose();
    } catch (err) {
      console.error('Transfer between wallets failed:', err);
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setIsSending(false);
      setInfo('');
    }
  };

  const DirectionToggle = () => (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={direction === 'fund' ? 'default' : 'outline'}
        onClick={() => setDirection('fund')}
        className={direction === 'fund' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'border-slate-600 text-slate-300'}
      >
        <ArrowDownToLine className="w-4 h-4 mr-2" />
        Fund VINmint
      </Button>
      <Button
        type="button"
        variant={direction === 'withdraw' ? 'default' : 'outline'}
        onClick={() => setDirection('withdraw')}
        className={direction === 'withdraw' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'border-slate-600 text-slate-300'}
      >
        <ArrowUpFromLine className="w-4 h-4 mr-2" />
        Withdraw
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-purple-500 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-purple-400" />
            Transfer Between Wallets
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Move SOL between your connected wallet and your VINmint wallet. Purchases always use the VINmint wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <DirectionToggle />

          <div className="rounded-lg bg-slate-900/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">From</span>
              <span className="text-white font-mono">
                {direction === 'fund' ? shortAddr(connectedWallet) : `VINmint ${shortAddr(vinmintWallet)}`}
              </span>
            </div>
            <div className="flex items-center justify-center my-1 text-purple-400">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">To</span>
              <span className="text-white font-mono">
                {direction === 'fund' ? `VINmint ${shortAddr(vinmintWallet)}` : shortAddr(connectedWallet)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="btw-amount" className="text-right text-purple-300">
              SOL
            </Label>
            <Input
              id="btw-amount"
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="col-span-3 bg-slate-700/50 border-purple-500/30 text-white"
            />
          </div>

          {info && (
            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-500/30 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
          <Button onClick={handleSend} disabled={isSending} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
            {isSending ? 'Processing...' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}