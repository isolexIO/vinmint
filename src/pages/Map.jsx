import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CertifiedShop } from '@/entities/CertifiedShop';
import { base44 } from '@/api/base44Client';
import { Store, Building, MapPin, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getSolanaStats } from '@/functions/getSolanaStats';

// Custom SVG Icon for Shops
const shopIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#A78BFA" width="32" height="32"><path d="M12 2L3 8v12h18V8L12 2zm7 16h-4v-4h-2v4H9v-4H7v4H5v-7.81l7-4.66 7 4.66V18z"/><path d="M10 12h4v4h-4z"/></svg>')}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Custom SVG Icon for Dealers
const dealerIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FBBF24" width="32" height="32"><path d="M4 21V9l8-6 8 6v12h-6v-7h-4v7H4z"/></svg>')}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const defaultCenter = [39.8283, -98.5795]; // Center of Continental US
const defaultZoom = 4;

function MapViewUpdater({ locations }) {
    const map = useMap();
    
    useEffect(() => {
        if (locations && locations.length > 0) {
            const validLocations = locations.filter(loc => 
                loc.latitude && loc.longitude && 
                !isNaN(loc.latitude) && !isNaN(loc.longitude)
            );
            
            if (validLocations.length > 0) {
                const bounds = L.latLngBounds(validLocations.map(loc => [loc.latitude, loc.longitude]));
                // Add padding and ensure minimum zoom level
                map.fitBounds(bounds, { 
                    padding: [50, 50], 
                    maxZoom: 8 
                });
            } else {
                map.setView(defaultCenter, defaultZoom);
            }
        } else {
            map.setView(defaultCenter, defaultZoom);
        }
    }, [locations, map]);
    
    return null;
}

export default function MapPage() {
    const [shops, setShops] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('shops');

    useEffect(() => {
        const loadMapData = async () => {
            setIsLoading(true);
            try {
                const [shopData, userData] = await Promise.all([
                    CertifiedShop.list(),
                    base44.entities.User.filter({ user_type: 'dealer' })
                ]);

                // Filter and validate coordinates for shops that are approved
                const validShops = shopData.filter(shop => 
                    shop.status === 'approved' && 
                    shop.latitude && 
                    shop.longitude &&
                    !isNaN(shop.latitude) && 
                    !isNaN(shop.longitude) &&
                    shop.latitude >= -90 && shop.latitude <= 90 &&
                    shop.longitude >= -180 && shop.longitude <= 180
                );

                // Filter and validate coordinates for dealers that are approved and have completed profile
                const validDealers = userData.filter(dealer => 
                    dealer.dealer_status === 'approved' && 
                    dealer.profile_completed === true &&
                    dealer.latitude && 
                    dealer.longitude &&
                    !isNaN(dealer.latitude) && 
                    !isNaN(dealer.longitude) &&
                    dealer.latitude >= -90 && dealer.latitude <= 90 &&
                    dealer.longitude >= -180 && dealer.longitude <= 180
                );
                
                console.log(`Loaded ${validShops.length} shops and ${validDealers.length} dealers with valid coordinates`);
                
                setShops(validShops);
                setDealers(validDealers);

            } catch (error) {
                console.error("Failed to fetch map data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadMapData();
    }, []);

    const markersToShow = activeTab === 'shops' ? shops : dealers;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/ff9fce36a_493130015_122093779586861598_4848437929607844438_n.jpg" 
                        alt="VINmint Logo" 
                        className="mx-auto h-16 w-16 rounded-xl mb-4 animate-pulse" 
                    />
                    <p className="text-white text-xl">Loading network map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-full mx-auto">
                <div className="text-center mb-8 pt-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/ff9fce36a_493130015_122093779586861598_4848437929607844438_n.jpg" 
                        alt="VINmint Logo" 
                        className="mx-auto h-16 w-16 rounded-xl mb-4" 
                    />
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
                        VINmint Network Map
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        Explore our growing network of certified shops and dealers across the United States.
                    </p>
                </div>
                
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
                    <CardContent className="p-0 flex flex-col">
                        <div className="p-4 border-b border-purple-500/20">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="bg-slate-800/50 border border-purple-500/20 p-1">
                                    <TabsTrigger value="shops" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                                        <Store className="w-4 h-4 mr-2" /> Certified Shops ({shops.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="dealers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                                        <Building className="w-4 h-4 mr-2" /> Certified Dealers ({dealers.length})
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="h-[600px] w-full">
                            <MapContainer 
                                center={defaultCenter} 
                                zoom={defaultZoom} 
                                scrollWheelZoom={true} 
                                style={{ height: '100%', width: '100%', backgroundColor: '#1E293B' }}
                                maxBounds={[
                                    [20, -130], // Southwest corner (latitude, longitude)
                                    [50, -60]   // Northeast corner
                                ]}
                                minZoom={3}
                                maxZoom={15}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                
                                <MapViewUpdater locations={markersToShow} />

                                {markersToShow.map(item => (
                                    activeTab === 'shops' ? (
                                        <Marker key={`shop-${item.id}`} position={[item.latitude, item.longitude]} icon={shopIcon}>
                                            <Popup className="custom-popup">
                                                <div className="p-3 bg-slate-800 rounded-lg text-white min-w-[200px]">
                                                    <h3 className="font-bold text-lg text-purple-300 mb-2">{item.shop_name}</h3>
                                                    <p className="text-slate-300 text-sm flex items-center gap-2 mb-2">
                                                        <MapPin className="w-3 h-3"/> {item.address}
                                                    </p>
                                                    {item.phone && (
                                                        <p className="text-slate-400 text-xs mb-2">📞 {item.phone}</p>
                                                    )}
                                                    <Link to={createPageUrl(`ShopProfile?id=${item.id}`)}>
                                                        <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                                                            <Eye className="w-4 h-4 mr-2"/>View Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ) : (
                                        <Marker key={`dealer-${item.id}`} position={[item.latitude, item.longitude]} icon={dealerIcon}>
                                            <Popup className="custom-popup">
                                                <div className="p-3 bg-slate-800 rounded-lg text-white min-w-[200px]">
                                                    <h3 className="font-bold text-lg text-yellow-300 mb-2">{item.full_name}</h3>
                                                    <p className="text-slate-300 text-sm flex items-center gap-2 mb-2">
                                                        <MapPin className="w-3 h-3"/> {item.address}
                                                    </p>
                                                    {item.phone && (
                                                        <p className="text-slate-400 text-xs mb-2">📞 {item.phone}</p>
                                                    )}
                                                    <Link to={createPageUrl(`DealerProfile?id=${item.id}`)}>
                                                        <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700">
                                                            <Eye className="w-4 h-4 mr-2"/>View Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                ))}
                            </MapContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}