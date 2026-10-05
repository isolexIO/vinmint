import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, DollarSign, User, Shield, Copy, Share2, X, ExternalLink, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from '@/utils';
import { exportInvoiceToPdf } from '@/functions/exportInvoiceToPdf.js';

const VinTokenLogoSmall = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-4 h-4 rounded-full" />
);

export default function InvoiceDetailModal({ isOpen, onClose, invoice }) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${createPageUrl('InvoicePublicView')}?id=${invoice.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Public link copied to clipboard!');
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await exportInvoiceToPdf({ invoiceId: invoice.id });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        throw new Error("Failed to get PDF data");
      }
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Could not download the invoice PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Invoice Details</DialogTitle>
              <p className="text-sm text-slate-400">{invoice.invoice_number}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="flex-shrink-0">
                <X className="w-5 h-5" />
          </Button>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Status</p>
              <Badge className={getStatusColor(invoice.payment_status)}>
                {invoice.payment_status}
              </Badge>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-slate-400">Issued Date</p>
              <p className="text-base text-white">{format(new Date(invoice.created_date), 'MMM d, yyyy')}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-slate-400 mb-1 flex items-center gap-2"><User size={16}/>Billed To</p>
            <p className="text-base text-white">{invoice.customer_email}</p>
          </div>

          <div className="p-4 bg-slate-800 rounded-lg space-y-4">
             <h4 className="font-semibold text-purple-300">Item Details</h4>
             <div className="flex justify-between items-start">
                <div>
                  <p className="text-white capitalize">{invoice.invoice_type.replace(/_/g, ' ')}</p>
                  <p className="text-slate-400 text-sm max-w-xs">{invoice.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-white font-semibold flex items-center justify-end gap-1"><VinTokenLogoSmall/> {invoice.amount_vin.toFixed(2)} VIN</p>
                  <p className="text-slate-400 text-sm">~${invoice.amount_usd.toFixed(2)}</p>
                </div>
             </div>
             <div className="pt-4 border-t border-slate-700 flex justify-between items-center text-lg">
                <p className="font-semibold text-white">Total</p>
                <p className="font-bold text-green-300 flex items-center gap-2"><VinTokenLogoSmall/> {invoice.final_amount_vin.toFixed(2)} VIN</p>
             </div>
          </div>

          {invoice.transaction_hash && (
            <div>
              <h3 className="text-base font-semibold text-purple-300 mb-2 flex items-center gap-2"><Shield size={16}/>Blockchain Payment</h3>
              <div className="p-4 bg-slate-800 rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-slate-400">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-mono break-all">{invoice.transaction_hash}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(invoice.transaction_hash)}><Copy size={14}/></Button>
                  </div>
                </div>
                 <a href={`https://solscan.io/tx/${invoice.transaction_hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
                    View on Solscan <ExternalLink size={14}/>
                </a>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
             <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-gradient-to-r from-blue-600 to-sky-600 text-white"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
             <Button
              onClick={handleShare}
              className="bg-gradient-to-r from-blue-600 to-sky-600 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Public Link
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}