
import React, { useState, useEffect, useCallback } from "react";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { CertifiedShop } from "@/entities/CertifiedShop";
import { Vehicle } from "@/entities/Vehicle";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Store,
  Plus,
  Wrench,
  Star,
  Search,
  Shield,
  CheckCircle,
  AlertTriangle,
  Car,
  Loader2,
  Wallet,
  User as UserIcon,
  ExternalLink // Imported for the explorer link
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { mintServiceNFT } from "@/functions/mintServiceNFT";
import ShopProfileManager from "../components/shop/ShopProfileManager"; // Replaces ServiceManager for overall profile management

const BaseLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="5" fill="currentColor"/>
    </svg>
);

const SolanaLogo = () => (
  <svg width="24" height="24" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#solana-gradient)" />
    <defs><linearGradient id="solana-gradient" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
  </svg>
);

const VinTokenLogo = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-4 h-4 rounded-full" />
);

const useSolanaPrice = () => {
    const [price, setPrice] = useState(null);
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
                const data = await response.json();
                setPrice(data.solana.usd);
            } catch (error) {
                console.error("Failed to fetch Solana price", error);
                setPrice(200); // Fallback price for SOL
            }
        };
        fetchPrice();
    }, []);
    return price;
};

export default function ShopDashboard() {
  const [shop, setShop] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [searchVIN, setSearchVIN] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    service_type: "",
    service_details: "",
    parts_replaced: "",
    cost: "",
    mileage_at_service: "",
    warranty_months: ""
  });
  const [isMintingNFT, setIsMintingNFT] = useState({});
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [selectedRecordForMinting, setSelectedRecordForMinting] = useState(null);
  const solPrice = useSolanaPrice();
  const mintFeeUSD = 1; // $1 USD fee
  const vinTokenPrice = 0.10; // $0.10 per VIN token
  const mintFeeVIN = mintFeeUSD / vinTokenPrice; // 10 VIN tokens

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (user.user_type !== 'shop_owner' && user.user_type !== 'admin') {
          window.location.href = createPageUrl("CustomerDashboard");
          return;
        }

        let shopData = null;
        let serviceData = [];

        if (user.user_type === 'admin') {
          const shops = await CertifiedShop.list();
          if (shops.length > 0) {
            shopData = shops[0]; // Admin typically manages the first shop for demo or selects one
            serviceData = await ServiceRecord.list("-created_date");
          }
        } else if (user.shop_id) {
          shopData = await CertifiedShop.get(user.shop_id);
          serviceData = await ServiceRecord.filter({ shop_id: user.shop_id }, "-created_date");
        }

        const vehicleData = await Vehicle.list();

        setShop(shopData);
        setServiceRecords(serviceData);
        setVehicles(vehicleData);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  const handleServicesUpdate = useCallback((updatedServices) => {
    setShop(prev => ({...prev, offered_services: updatedServices}));
  }, []);

  const handleShopUpdate = useCallback((updatedShop) => {
    setShop(updatedShop);
  }, []);

  const searchVehicle = async () => {
    if (!searchVIN.trim()) return;

    try {
      const vehicle = vehicles.find(v => v.vin.toUpperCase() === searchVIN.toUpperCase());
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setShowServiceForm(true);
      } else {
        alert("Vehicle not found. Please ensure the VIN is registered in the system.");
      }
    } catch (error) {
      console.error("Error searching vehicle:", error);
    }
  };

  const handleMintNFT = async () => {
    if (!selectedRecordForMinting) return;

    const recordId = selectedRecordForMinting.id;
    setIsMintingNFT(prev => ({ ...prev, [recordId]: true }));
    setShowMintDialog(false);

    try {
      console.log(`Attempting to mint NFT for service record ${recordId}`);
      
      const response = await mintServiceNFT({
        serviceRecordId: recordId,
        recipientAddress: null
      });

      if (response.data.success) {
        alert(`Service NFT minted successfully on Solana!\nTransaction: ${response.data.transaction_hash}\nRecipient: ${response.data.recipient}`);
        const updatedRecords = serviceRecords.map(rec =>
          rec.id === recordId
            ? { 
                ...rec, 
                nft_token_id: response.data.nft_token_id, 
                nft_tx_hash: response.data.transaction_hash, 
                nft_chain: 'Solana',
                nft_recipient: response.data.recipient
              }
            : rec
        );
        setServiceRecords(updatedRecords);
      } else {
        throw new Error(response.data.error || "Unknown error during NFT minting.");
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      let errorMessage = "Failed to mint NFT: ";
      
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
        if (error.response.data.vehicleVin) {
          errorMessage += `\n\nVehicle VIN: ${error.response.data.vehicleVin}`;
        }
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsMintingNFT(prev => ({ ...prev, [recordId]: false }));
      setSelectedRecordForMinting(null);
    }
  };

  const openMintConfirmation = (record) => {
    setSelectedRecordForMinting(record);
    setShowMintDialog(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVehicle || !shop) {
      alert("Please select a vehicle and ensure shop data is loaded.");
      return;
    }

    try {
      const partsArray = serviceForm.parts_replaced
        ? serviceForm.parts_replaced.split(',').map(p => p.trim())
        : [];

      const serviceData = {
        vehicle_id: selectedVehicle.id,
        vin: selectedVehicle.vin,
        shop_id: shop.id,
        shop_name: shop.shop_name,
        service_type: serviceForm.service_type,
        parts_replaced: partsArray,
        cost: parseFloat(serviceForm.cost) || 0,
        mileage_at_service: parseInt(serviceForm.mileage_at_service) || 0,
        warranty_months: parseInt(serviceForm.warranty_months) || 0,
        service_details: serviceForm.service_details,
        mechanic_signature: `SIGNED_BY_${shop.certification_id}_${Date.now()}`
      };

      const newRecord = await ServiceRecord.create(serviceData);

      if (currentUser.user_type !== 'admin') {
        await CertifiedShop.update(shop.id, {
          total_services: (shop.total_services || 0) + 1
        });
      }

      alert("Service record created successfully! You can now mint the NFT on Solana from the 'Service Records' tab.");

      setServiceRecords([newRecord, ...serviceRecords]);
      setServiceForm({
        service_type: "",
        service_details: "",
        parts_replaced: "",
        cost: "",
        mileage_at_service: "",
        warranty_months: ""
      });
      setShowServiceForm(false);
      setSelectedVehicle(null);
      setSearchVIN("");

    } catch (error) {
      console.error("Error creating service record:", error);
      alert("Error creating service record. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg md:text-xl">Loading shop dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || (currentUser.user_type !== 'shop_owner' && currentUser.user_type !== 'admin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg bg-red-900/50 border-red-500/30 text-red-300">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription>
            Access Denied. You do not have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6 flex items-center justify-center">
         <Alert className="max-w-lg bg-yellow-900/50 border-yellow-500/30 text-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription>
            {currentUser.user_type === 'admin'
              ? "No shops available in the system. Create shops from the Admin Panel first."
              : "Your shop profile is not set up or linked. Please contact VINmint administration."
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
        <DialogContent className="bg-slate-800 border-purple-500 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-purple-400" />
              Confirm NFT Mint Fee
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">
              A small fee is required to cover the gas costs for minting this service record as an NFT on the Solana blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <div className="p-6 bg-slate-900/50 rounded-lg border border-purple-500/20 text-center">
                <p className="text-slate-300 text-lg">Minting Fee</p>
                <p className="text-4xl font-bold text-white my-2">${mintFeeUSD.toFixed(2)} USD</p>
                <div className="flex items-center justify-center gap-2">
                  <VinTokenLogo />
                  <p className="text-green-300 font-mono text-xl">
                    {mintFeeVIN} VIN
                  </p>
                </div>
            </div>
            <Alert className="bg-blue-500/10 border-blue-500/20 mt-4">
               <Shield className="h-4 w-4 text-blue-500" />
               <AlertDescription className="text-blue-300">
                   This fee covers the blockchain transaction cost and will be deducted from the vehicle owner's VIN token balance.
               </AlertDescription>
           </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMintDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
            <Button onClick={handleMintNFT} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <VinTokenLogo />
              <span className="ml-2">Confirm and Mint</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-6 md:mb-8 pt-4 md:pt-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Shop Dashboard
              {currentUser.user_type === 'admin' && (
                <span className="text-sm md:text-lg text-purple-400 ml-2">(Admin View)</span>
              )}
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">Issue service records and mint Solana NFTs</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {currentUser.user_type === 'admin' && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Admin Access
              </Badge>
            )}
            <Badge className={`px-4 py-2 ${shop?.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
              <Shield className="w-4 h-4 mr-2" />
              {shop?.status === 'approved' ? 'Certified Shop' : 'Pending Approval'}
            </Badge>
          </div>
        </div>

        {/* Shop Info Card */}
        {shop && (
          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-6 md:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
                <span className="text-lg md:text-xl">{shop.shop_name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Certification ID</p>
                  <p className="text-white font-mono text-xs md:text-base">{shop.certification_id}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Total Services</p>
                  <p className="text-white text-lg md:text-2xl font-bold">{shop.total_services || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-current" />
                    <span className="text-white font-bold text-sm md:text-base">{shop.rating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Solana NFTs Issued</p>
                  <p className="text-white text-lg md:text-2xl font-bold">
                    {serviceRecords.filter(r => r.nft_token_id).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - show for both approved shops and admins */}
        {(shop?.status === 'approved' || currentUser.user_type === 'admin') && (
          <Tabs defaultValue="new-service" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-purple-500/20 p-1 h-auto">
              <TabsTrigger
                value="new-service"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">New Service</span>
                <span className="sm:hidden">New</span>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
              >
                <Wrench className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Service Records</span>
                <span className="sm:hidden">Records</span>
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
              >
                <UserIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Shop Settings</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new-service">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Vehicle Search */}
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg md:text-xl">Find Vehicle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-purple-300">Vehicle VIN</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={searchVIN}
                          onChange={(e) => setSearchVIN(e.target.value.toUpperCase())}
                          placeholder="Enter 17-character VIN"
                          maxLength={17}
                          className="bg-slate-700/50 border-purple-500/30 text-white text-xs md:text-sm"
                        />
                        <Button onClick={searchVehicle} className="bg-purple-600 hover:bg-purple-700 px-3">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {selectedVehicle && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Alert className="bg-green-500/10 border-green-500/20">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-green-300">
                            <div className="font-semibold text-sm md:text-base">
                              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                            </div>
                            <div className="text-xs md:text-sm mt-1">
                              Domain: {selectedVehicle.domain}
                            </div>
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Form */}
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg md:text-xl">Service Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVehicle ? (
                      <form onSubmit={handleServiceSubmit} className="space-y-4">
                        <div>
                          <Label className="text-purple-300">Service Type</Label>
                          <Select
                            value={serviceForm.service_type}
                            onValueChange={(value) => setServiceForm(prev => ({...prev, service_type: value}))}
                          >
                            <SelectTrigger className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-purple-500/30">
                              <SelectItem value="oil_change">Oil Change</SelectItem>
                              <SelectItem value="brake_repair">Brake Repair</SelectItem>
                              <SelectItem value="tire_replacement">Tire Replacement</SelectItem>
                              <SelectItem value="engine_repair">Engine Repair</SelectItem>
                              <SelectItem value="transmission">Transmission</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="accident_repair">Accident Repair</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-purple-300">Service Details</Label>
                          <Textarea
                            value={serviceForm.service_details}
                            onChange={(e) => setServiceForm(prev => ({...prev, service_details: e.target.value}))}
                            placeholder="Describe the work performed..."
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-purple-300">Cost ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={serviceForm.cost}
                              onChange={(e) => setServiceForm(prev => ({...prev, cost: e.target.value}))}
                              className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-purple-300">Mileage</Label>
                            <Input
                              type="number"
                              value={serviceForm.mileage_at_service}
                              onChange={(e) => setServiceForm(prev => ({...prev, mileage_at_service: e.target.value}))}
                              className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-purple-300">Parts Replaced (comma-separated)</Label>
                          <Input
                            value={serviceForm.parts_replaced}
                            onChange={(e) => setServiceForm(prev => ({...prev, parts_replaced: e.target.value}))}
                            placeholder="e.g., Oil Filter, Air Filter, Brake Pads"
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-purple-300">Warranty (months)</Label>
                          <Input
                            type="number"
                            value={serviceForm.warranty_months}
                            onChange={(e) => setServiceForm(prev => ({...prev, warranty_months: e.target.value}))}
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2 text-xs md:text-sm"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 text-sm md:text-base"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Service Record
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Car className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-4" />
                        <p className="text-sm md:text-base">Search for a vehicle to create a service record</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="services">
              <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg md:text-xl">All Service Records</CardTitle>
                  <p className="text-slate-400 text-sm">Manage and mint NFTs for service records from your shop.</p>
                </CardHeader>
                <CardContent>
                  {serviceRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg md:text-xl font-semibold text-slate-400 mb-2">No service records yet</h3>
                      <p className="text-sm md:text-base text-slate-500">
                        Create your first service record to see it here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serviceRecords.map((record) => (
                        <div key={record.id} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 md:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                                <h4 className="text-lg font-semibold text-white">
                                  {record.service_type.replace(/_/g, ' ').toUpperCase()}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                    VIN: {record.vin}
                                  </Badge>
                                  {record.nft_token_id ? (
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs flex items-center gap-1">
                                      <SolanaLogo />
                                      NFT Minted
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                      Ready to Mint
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-slate-300 text-sm md:text-base mb-2">{record.service_details}</p>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
                                <div>
                                  <span className="font-medium">Date:</span>
                                  <br />
                                  {format(new Date(record.created_date), "MMM d, yyyy")}
                                </div>
                                <div>
                                  <span className="font-medium">Cost:</span>
                                  <br />
                                  ${record.cost?.toFixed(2) || '0.00'}
                                </div>
                                <div>
                                  <span className="font-medium">Mileage:</span>
                                  <br />
                                  {record.mileage_at_service?.toLocaleString() || 'N/A'} mi
                                </div>
                                <div>
                                  <span className="font-medium">Warranty:</span>
                                  <br />
                                  {record.warranty_months || '0'} months
                                </div>
                              </div>

                              {record.parts_replaced && record.parts_replaced.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-slate-400 text-xs font-medium">Parts Replaced:</span>
                                  <p className="text-slate-300 text-sm mt-1">{record.parts_replaced.join(', ')}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-auto mt-4 lg:mt-0">
                              {record.nft_token_id ? (
                                <>
                                  <div className="text-center lg:text-right">
                                    <p className="text-green-400 text-sm font-medium mb-1">✓ NFT Minted</p>
                                    <p className="text-slate-400 text-xs font-mono break-all lg:break-normal">
                                      {record.nft_token_id.substring(0, 8)}...
                                    </p>
                                  </div>
                                  <a 
                                    href={`https://solscan.io/tx/${record.nft_tx_hash}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full lg:w-auto"
                                  >
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full text-purple-200 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-white"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      View on Solscan
                                    </Button>
                                  </a>
                                </>
                              ) : (
                                <Button
                                  onClick={() => openMintConfirmation(record)}
                                  disabled={isMintingNFT[record.id]}
                                  className="w-full lg:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                                >
                                  {isMintingNFT[record.id] ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Minting...
                                    </>
                                  ) : (
                                    <>
                                      <Wallet className="w-4 h-4 mr-2" />
                                      Mint NFT
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg md:text-xl">Shop Settings & Profile</CardTitle>
                  <p className="text-slate-400 text-xs md:text-sm">Manage your shop's public profile and offerings.</p>
                </CardHeader>
                <CardContent>
                  <ShopProfileManager
                    shop={shop}
                    currentUser={currentUser}
                    onShopUpdate={handleShopUpdate}
                    onServicesUpdate={handleServicesUpdate}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
