import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Wrench, 
    FileText, 
    Shield, 
    Copy,
    Share2,
    X,
    ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from '@/utils';

export default function ServiceRecordDetailModal({ isOpen, onClose, record }) {
  const handleShare = () => {
    const shareUrl = `${window.location.origin}${createPageUrl('ServiceRecordPublicView')}?id=${record.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Public link copied to clipboard!');
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                    <DialogTitle className="text-xl capitalize">
                        {record.service_type.replace(/_/g, ' ')}
                    </DialogTitle>
                    <p className="text-sm text-slate-400">
                        Serviced on {format(new Date(record.created_date), 'MMMM d, yyyy')}
                    </p>
                </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="flex-shrink-0">
                <X className="w-5 h-5" />
            </Button>
        </DialogHeader>

        <div className="py-4 space-y-6">
            <div>
                <h3 className="text-base font-semibold text-purple-300 mb-2 flex items-center gap-2"><FileText size={16}/>Details</h3>
                <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                    <div>
                        <p className="text-sm text-slate-400">Service Provider</p>
                        <p className="text-base text-white">{record.shop_name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Mileage at Service</p>
                        <p className="text-base text-white">{record.mileage_at_service?.toLocaleString() || 'N/A'} mi</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Service Details</p>
                        <p className="text-base text-white whitespace-pre-wrap">{record.service_details}</p>
                    </div>
                    {record.parts_replaced && record.parts_replaced.length > 0 && (
                        <div>
                            <p className="text-sm text-slate-400">Parts Replaced</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {record.parts_replaced.map((part) => (
                                    <Badge key={part} variant="secondary">{part}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {record.nft_token_id ? (
                <div>
                    <h3 className="text-base font-semibold text-purple-300 mb-2 flex items-center gap-2"><Shield size={16}/>Blockchain Record</h3>
                    <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                        <div>
                            <p className="text-sm text-slate-400">NFT Token ID</p>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-white font-mono break-all">{record.nft_token_id}</p>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(record.nft_token_id)}><Copy size={14}/></Button>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Minted On</p>
                            <p className="text-base text-white">{format(new Date(record.nft_minted_date), 'MMMM d, yyyy, h:mm a')}</p>
                        </div>
                        <a href={`https://solscan.io/token/${record.nft_token_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
                            View on Solscan <ExternalLink size={14}/>
                        </a>
                    </div>
                </div>
            ) : (
                 <div className="p-4 bg-yellow-900/50 border border-yellow-500/30 rounded-lg text-center">
                    <p className="text-yellow-300 font-medium">This record has not been minted as an NFT yet.</p>
                </div>
            )}
        </div>
        
        <DialogFooter>
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