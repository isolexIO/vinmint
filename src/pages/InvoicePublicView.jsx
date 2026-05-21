import React, { useState, useEffect } from 'react';
import { Invoice } from '@/entities/Invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, User, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const VinTokenLogoSmall = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-4 h-4 rounded-full" />
);

const InvoicePublicView = () => {
    const [invoice, setInvoice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const invoiceId = urlParams.get('id');
                if (!invoiceId) {
                    setError("No invoice ID provided.");
                    setIsLoading(false);
                    return;
                }

                const invoiceData = await Invoice.get(invoiceId);
                setInvoice(invoiceData);
            } catch (err) {
                console.error("Error loading public invoice:", err);
                setError("Could not load the invoice. It may be private or no longer exist.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">
                 <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                Loading Invoice...
            </div>
        );
    }

    if (error) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400 text-xl">{error}</div>;
    }

    if (!invoice) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Invoice not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                 <header className="text-center mb-8">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" 
                      alt="VINmint Logo"
                      className="w-20 h-20 mx-auto mb-4 rounded-full"
                    />
                    <h1 className="text-3xl font-bold text-white">Invoice Details</h1>
                    <p className="text-slate-300">Powered by VINmint</p>
                </header>

                <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="border-b border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400">Invoice</p>
                                <CardTitle className="text-xl text-white">{invoice.invoice_number}</CardTitle>
                            </div>
                            <Badge className={getStatusColor(invoice.payment_status)}>{invoice.payment_status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-400 text-sm flex items-center gap-1"><Calendar size={14}/>Issued Date</p>
                                <p className="text-white font-medium">{format(new Date(invoice.created_date), 'MMMM d, yyyy')}</p>
                            </div>
                            {invoice.payment_date && (
                                <div>
                                    <p className="text-slate-400 text-sm flex items-center gap-1"><Calendar size={14}/>Paid Date</p>
                                    <p className="text-white font-medium">{format(new Date(invoice.payment_date), 'MMMM d, yyyy')}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm flex items-center gap-1"><User size={14}/>Billed To</p>
                            <p className="text-white font-medium">{invoice.customer_email}</p>
                        </div>

                        <div className="border-y border-slate-700 py-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Item Details</h3>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-white capitalize">{invoice.invoice_type.replace(/_/g, ' ')}</p>
                                    <p className="text-slate-400 text-sm max-w-xs">{invoice.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-semibold flex items-center justify-end gap-1">
                                        <VinTokenLogoSmall/> {invoice.amount_vin.toFixed(2)} VIN
                                    </p>
                                    <p className="text-slate-400 text-sm">~${invoice.amount_usd.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <div className="flex justify-between items-center text-lg">
                                <p className="text-slate-300">Total</p>
                                <p className="text-green-300 font-bold flex items-center gap-2">
                                  <VinTokenLogoSmall/> {invoice.final_amount_vin.toFixed(2)} VIN
                                </p>
                            </div>
                             <p className="text-right text-slate-400 text-sm">Paid ~${invoice.amount_usd.toFixed(2)}</p>
                        </div>

                        {invoice.transaction_hash && (
                             <div className="pt-4 border-t border-slate-700">
                                <p className="text-slate-400 text-sm flex items-center gap-1 mb-1"><Shield size={14}/>Blockchain Transaction</p>
                                <p className="text-purple-300 font-mono text-xs break-all">{invoice.transaction_hash}</p>
                                <a 
                                  href={`https://solscan.io/tx/${invoice.transaction_hash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 text-sm hover:text-blue-300 transition mt-2 inline-block"
                                >
                                    View on Solscan →
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InvoicePublicView;