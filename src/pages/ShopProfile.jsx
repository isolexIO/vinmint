import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CertifiedShop } from '@/entities/CertifiedShop';
import { ServiceRecord } from '@/entities/ServiceRecord';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, Phone, Mail, CheckCircle, Wrench } from 'lucide-react';
import { format } from 'date-fns';

export default function ShopProfile() {
    const location = useLocation();
    const [shop, setShop] = useState(null);
    const [serviceRecords, setServiceRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchShopData = async () => {
            const params = new URLSearchParams(location.search);
            const shopId = params.get('id');

            if (!shopId) {
                setIsLoading(false);
                return;
            }

            try {
                const [shopData, recordsData] = await Promise.all([
                    CertifiedShop.get(shopId),
                    ServiceRecord.filter({ shop_id: shopId }, '-created_date', 50)
                ]);
                setShop(shopData);
                setServiceRecords(recordsData);
            } catch (error) {
                console.error("Failed to fetch shop profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchShopData();
    }, [location]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/ff9fce36a_493130015_122093779586861598_4848437929607844438_n.jpg" 
                    alt="VINmint Logo"
                    className="w-16 h-16 rounded-xl animate-pulse"
                />
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">Shop not found.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-8">
                    <CardHeader>
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <Store className="w-12 h-12 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-bold text-white mb-2">{shop.shop_name}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1"/> Certified Shop</Badge>
                                    <Badge variant="outline" className="text-slate-300 border-slate-600">Rating: {shop.rating}/5</Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 text-slate-300">
                        <div className="space-y-3">
                            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" /> {shop.address}</p>
                            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-purple-400" /> {shop.phone}</p>
                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-purple-400" /> {shop.email}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-2">Specialties</h4>
                            <div className="flex flex-wrap gap-2">
                                {shop.specialties?.map(s => <Badge key={s} variant="outline" className="text-purple-300 border-purple-500/50">{s.replace(/_/g, ' ')}</Badge>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-8">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Services Offered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {shop.offered_services && shop.offered_services.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {shop.offered_services.map((service, index) => (
                                    <Badge key={index} className="px-4 py-2 text-md bg-slate-700 text-slate-200">{service}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400">This shop has not listed its services yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Recent Service History ({serviceRecords.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                        {serviceRecords.length > 0 ? serviceRecords.map(record => (
                            <div key={record.id} className="p-3 rounded-lg bg-slate-700/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Wrench className="w-5 h-5 text-purple-300" />
                                    <div>
                                        <p className="font-semibold text-white">{record.vin}</p>
                                        <p className="text-sm text-slate-400">{record.service_details}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-300">{format(new Date(record.created_date), 'MMM d, yyyy')}</p>
                                    <Badge variant="outline" className="mt-1 border-purple-500/50 text-purple-300">{record.service_type.replace(/_/g, ' ')}</Badge>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-slate-400 py-8">No service records found for this shop.</p>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}