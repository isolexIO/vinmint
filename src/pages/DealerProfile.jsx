import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Vehicle } from '@/entities/Vehicle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Phone, Mail, CheckCircle, Car, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DealerProfile() {
    const location = useLocation();
    const [dealer, setDealer] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDealerData = async () => {
            const params = new URLSearchParams(location.search);
            const dealerId = params.get('id');

            if (!dealerId) {
                setIsLoading(false);
                return;
            }

            try {
                const [dealerData, vehicleData] = await Promise.all([
                    base44.entities.User.get(dealerId),
                    Vehicle.filter({ dealer_id: dealerId }, '-created_date', 50)
                ]);
                setDealer(dealerData);
                setVehicles(vehicleData);
            } catch (error) {
                console.error("Failed to fetch dealer profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDealerData();
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

    if (!dealer || dealer.user_type !== 'dealer') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">Dealer not found.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-8">
                    <CardHeader>
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                                <Building className="w-12 h-12 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-bold text-white mb-2">{dealer.full_name}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                        <CheckCircle className="w-3 h-3 mr-1"/> Certified Dealer
                                    </Badge>
                                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                                        {vehicles.length} Vehicles
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 text-slate-300">
                        <div className="space-y-3">
                            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-yellow-400" /> {dealer.address || 'Location not provided'}</p>
                            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-yellow-400" /> {dealer.phone || 'Phone not provided'}</p>
                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-yellow-400" /> {dealer.email}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-2">Business Info</h4>
                            <p className="text-slate-400">License: <span className="text-white font-mono">{dealer.business_license || 'Not provided'}</span></p>
                            <p className="text-slate-400">Member Since: <span className="text-white">{format(new Date(dealer.created_date), 'MMMM yyyy')}</span></p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Current Inventory ({vehicles.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {vehicles.length > 0 ? vehicles.map(vehicle => (
                                <div key={vehicle.id} className="p-4 rounded-lg bg-slate-700/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Car className="w-6 h-6 text-yellow-300" />
                                        <div>
                                            <p className="font-semibold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                            <p className="text-sm text-slate-400 font-mono">{vehicle.vin}</p>
                                            <p className="text-xs text-slate-500">{vehicle.domain}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">
                                            {vehicle.status}
                                        </Badge>
                                        <div>
                                            <Link to={`${createPageUrl("Explorer")}?vin=${vehicle.vin}`}>
                                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20">
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    View Details
                                                </Badge>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-slate-400 py-8">No vehicles in inventory.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}