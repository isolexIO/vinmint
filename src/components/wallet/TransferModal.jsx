
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send } from "lucide-react";
import { transferTokens } from "@/functions/transferTokens";

const SolanaLogo = () => (
    <svg width="24" height="24" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline-block mr-2">
      <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#solana-gradient)" />
      <defs><linearGradient id="solana-gradient" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
    </svg>
);

const VinTokenLogo = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_484843792960784443" alt="VIN Token" className="w-5 h-5 rounded-full mr-2" />
);


export default function TransferModal({ isOpen, onClose, onTransferSuccess }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState('VIN');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    if (!recipient || !amount || !tokenType || parseFloat(amount) <= 0) {
      setError('Please fill all fields correctly.');
      return;
    }
    setIsSending(true);
    try {
      const response = await transferTokens({
        recipientAddress: recipient,
        amount: parseFloat(amount),
        tokenType: tokenType
      });

      if (response.data.success) {
        alert(`Transfer successful! Transaction hash: ${response.data.transaction_hash}`);
        onTransferSuccess();
        onClose();
      } else {
        throw new Error(response.data.error || 'Transfer failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An unknown error occurred.');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-purple-500 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">Send Tokens</DialogTitle>
          <DialogDescription className="text-slate-400">
            Transfer SOL or $VIN tokens to another Solana wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient" className="text-right text-purple-300">
              Recipient
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Solana wallet address"
              className="col-span-3 bg-slate-700/50 border-purple-500/30 text-white"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right text-purple-300">
              Token
            </Label>
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger className="col-span-3 bg-slate-700/50 border-purple-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-purple-500/30 text-white">
                <SelectItem value="VIN" className="focus:bg-purple-500/20">
                  <div className="flex items-center">
                    <VinTokenLogo />
                    $VIN
                  </div>
                </SelectItem>
                <SelectItem value="SOL" className="focus:bg-purple-500/20">
                  <div className="flex items-center">
                    <SolanaLogo />
                    SOL
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right text-purple-300">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="col-span-3 bg-slate-700/50 border-purple-500/30 text-white"
            />
          </div>
          {error && (
            <Alert variant="destructive" className="bg-red-900/50 border-red-500/30 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
          <Button onClick={handleSend} disabled={isSending} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
