import React, { useState, useEffect } from 'react';
import { ServiceRecord } from '@/entities/ServiceRecord';
import { Vehicle } from '@/entities/Vehicle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, Wrench, Shield, Star, FileText, MapPin, DollarSign, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ServiceRecordPublicView = () => {
    const [record, setRecord] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const recordId = urlParams.get('id');
                if (!recordId) {
                    setError("No service record ID provided.");
                    setIsLoading(false);
                    return;
                }

                const serviceData = await ServiceRecord.get(recordId);
                setRecord(serviceData);

                if (serviceData.vehicle_id) {
                    const vehicleData = await Vehicle.get(serviceData.vehicle_id);
                    setVehicle(vehicleData);
                }
            } catch (err) {
                console.error("Error loading public record:", err);
                setError("Could not load the service record. It may be private or no longer exist.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">
                <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                Loading Service Record...
            </div>
        );
    }

    if (error) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400 text-xl">{error}</div>;
    }

    if (!record) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Service Record not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" 
                      alt="VINmint Logo"
                      className="w-20 h-20 mx-auto mb-4 rounded-full"
                    />
                    <h1 className="text-3xl font-bold text-white">Verified Service Record</h1>
                    <p className="text-slate-300">Powered by VINmint on Solana</p>
                </header>

                <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl text-white capitalize flex items-center gap-2">
                                    <Wrench className="text-purple-400"/>
                                    {record.service_type.replace(/_/g, ' ')}
                                </CardTitle>
                                <p className="text-slate-400">on {format(new Date(record.created_date), 'MMMM d, yyyy')}</p>
                            </div>
                            {record.nft_token_id ? (
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
                                    <Shield size={14} /> Minted
                                </Badge>
                            ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                    Not Minted
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {vehicle && (
                             <section>
                                <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2"><Car/>Vehicle Information</h3>
                                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><p className="text-slate-400 text-sm">Make</p><p className="text-white font-medium">{vehicle.make}</p></div>
                                    <div><p className="text-slate-400 text-sm">Model</p><p className="text-white font-medium">{vehicle.model}</p></div>
                                    <div><p className="text-slate-400 text-sm">Year</p><p className="text-white font-medium">{vehicle.year}</p></div>
                                    <div className="col-span-2 md:col-span-1"><p className="text-slate-400 text-sm">VIN</p><p className="text-purple-300 font-mono text-xs">{vehicle.vin}</p></div>
                                </div>
                            </section>
                        )}
                       
                        <section>
                            <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2"><FileText/>Service Details</h3>
                             <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 space-y-4">
                                <div>
                                    <p className="text-slate-400 text-sm">Service Provider</p>
                                    <p className="text-white font-medium flex items-center gap-2"><MapPin size={14}/>{record.shop_name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Description</p>
                                    <p className="text-white whitespace-pre-wrap">{record.service_details}</p>
                                </div>
                                {record.parts_replaced && record.parts_replaced.length > 0 && (
                                     <div>
                                        <p className="text-slate-400 text-sm">Parts Replaced</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {record.parts_replaced.map(part => <Badge variant="secondary" key={part}>{part}</Badge>)}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600/50">
                                    <div>
                                        <p className="text-slate-400 text-sm">Mileage at Service</p>
                                        <p className="text-white font-medium">{record.mileage_at_service.toLocaleString()} mi</p>
                                    </div>
                                    {record.cost && (
                                         <div>
                                            <p className="text-slate-400 text-sm">Service Cost</p>
                                            <p className="text-green-300 font-medium flex items-center gap-1"><DollarSign size={14}/>{record.cost.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </section>

                        {record.nft_token_id && (
                             <section>
                                <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2"><Shield/>Blockchain Verification</h3>
                                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 space-y-3 text-sm">
                                    <div>
                                        <p className="text-slate-400">NFT Token ID</p>
                                        <p className="text-purple-300 font-mono text-xs break-all">{record.nft_token_id}</p>
                                    </div>
                                     <div>
                                        <p className="text-slate-400">Transaction Hash</p>
                                        <p className="text-purple-300 font-mono text-xs break-all">{record.nft_tx_hash}</p>
                                    </div>
                                     <div>
                                        <p className="text-slate-400">Minted On</p>
                                        <p className="text-white">{format(new Date(record.nft_minted_date), 'MMMM d, yyyy, h:mm a')}</p>
                                    </div>
                                    <a 
                                      href={`https://solscan.io/token/${record.nft_token_id}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-block mt-2 text-blue-400 hover:text-blue-300 transition"
                                    >
                                        View on Solscan →
                                    </a>
                                </div>
                            </section>
                        )}
                        
                        {record.images && record.images.length > 0 && (
                            <section>
                                <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2"><ImageIcon/>Service Images</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {record.images.map((img, index) => (
                                        <img key={index} src={img} alt={`Service image ${index + 1}`} className="rounded-lg object-cover w-full h-auto aspect-square"/>
                                    ))}
                                </div>
                            </section>
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ServiceRecordPublicView;