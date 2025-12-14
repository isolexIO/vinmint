import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, QrCode } from "lucide-react";

// Simple QR Code generator using QR Server API
const QRCode = ({ value, size = 256 }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1e293b&color=ffffff`;
  
  return (
    <img 
      src={qrUrl}
      alt="QR Code"
      className="w-full h-full rounded-lg border-2 border-slate-600"
      style={{ maxWidth: size, maxHeight: size }}
    />
  );
};

export default function ReceiveModal({ isOpen, onClose, walletAddress }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    alert("Wallet address copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-purple-500 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <QrCode className="w-6 h-6 text-green-400" />
            Receive Tokens
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Share this wallet address or QR code to receive SOL or $VIN tokens
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* QR Code */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-6">
              <div className="flex justify-center">
                <QRCode value={walletAddress} size={200} />
              </div>
            </CardContent>
          </Card>

          {/* Wallet Address */}
          <div>
            <label className="text-sm font-medium text-purple-300 block mb-2">
              Wallet Address
            </label>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <p className="text-white font-mono text-sm break-all mb-3">
                {walletAddress}
              </p>
              <Button 
                onClick={copyToClipboard}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Address
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-300 font-semibold mb-2">How to Receive Tokens</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Share your wallet address with the sender</li>
              <li>• Or let them scan the QR code above</li>
              <li>• Supports SOL and $VIN tokens on Solana</li>
              <li>• Tokens will appear in your wallet once confirmed</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}