import React, { useState, useEffect } from "react";
import { Vehicle } from "@/entities/Vehicle";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { User } from "@/entities/User";
import { useWallet } from "@/lib/WalletContext";
import getWalletViewProfile from "@/components/wallet/getWalletViewProfile";
import WalletOnlyNotice from "@/components/wallet/WalletOnlyNotice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, 
  Plus, 
  Wrench, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Shield,
  ExternalLink,
  User as UserIcon,
  History
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

function VehicleCard({ vehicle, isOwner, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
    >
      <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl hover:bg-slate-800/70 transition-all duration-300 group">
        <CardHeader onClick={onClick}>
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Car className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm md:text-base font-semibold truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              <div className="text-xs md:text-sm font-mono text-purple-300 truncate">
                {vehicle.domain}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent onClick={onClick} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <Shield className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
              <span className="font-mono truncate">{vehicle.vin}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
              <span>Registered {format(new Date(vehicle.created_date), "MMM d, yyyy")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge 
              className={
                vehicle.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
              } 
              variant="outline"
            >
              {vehicle.status}
            </Badge>
            {vehicle.color && (
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                {vehicle.color}
              </Badge>
            )}
          </div>

          {/* Owner Wallet Address */}
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Owner Wallet</div>
            <div className="font-mono text-xs text-purple-300 break-all">{vehicle.owner_wallet}</div>
          </div>

          {/* Previous Owners */}
          {vehicle.previous_owners && vehicle.previous_owners.length > 0 && (
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                <History className="w-3 h-3" />
                Previous Owners ({vehicle.previous_owners.length})
              </div>
              <div className="space-y-1">
                {vehicle.previous_owners.slice(-2).map((owner, index) => (
                  <div key={index} className="font-mono text-xs text-slate-500 break-all">
                    {owner}
                  </div>
                ))}
                {vehicle.previous_owners.length > 2 && (
                  <div className="text-xs text-slate-600">
                    +{vehicle.previous_owners.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* View in Explorer Button - Only show if user is owner */}
        {isOwner && (
          <div className="px-6 pb-6" onClick={(e) => e.stopPropagation()}>
            <Button 
              onClick={() => window.location.href = `${createPageUrl("Explorer")}?vin=${vehicle.vin}`}
              className="w-full bg-gradient-to-r from-purple-600/80 to-blue-600/80 border border-purple-500/30 text-white hover:from-purple-600 hover:to-blue-600 hover:border-purple-400/50 transition-all duration-300 text-xs md:text-sm" 
              variant="outline"
            >
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              View in Explorer
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function CustomerDashboard() {
  const { walletAddress } = useWallet();
  const [hasAccount, setHasAccount] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [solanaPrice, setSolanaPrice] = useState(null);
  const [solanaLoading, setSolanaLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    fetchSolanaPrice();
  }, [walletAddress]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const authenticated = await User.isAuthenticated();
      setHasAccount(authenticated);
      if (!authenticated) {
        setUser(getWalletViewProfile(walletAddress));
        setVehicles([]);
        setServiceRecords([]);
        return;
      }
      const currentUser = await User.me();
      setUser({ ...currentUser, wallet_address: walletAddress || currentUser.wallet_address });

      if (currentUser && (currentUser.wallet_address || currentUser.user_type === 'admin')) {
        if (currentUser.user_type === 'admin') {
          const allVehicles = await Vehicle.list("-created_date");
          const allServiceRecords = await ServiceRecord.list("-created_date", 50);
          
          setVehicles(allVehicles);
          setServiceRecords(allServiceRecords);
        } else {
          const allVehicles = await Vehicle.list("-created_date");
          const userVehicles = allVehicles.filter(v => v.owner_wallet === currentUser.wallet_address);

          const vehicleIds = userVehicles.map(v => v.id);
          const allServiceRecords = await ServiceRecord.list("-created_date", 50);
          const userServiceRecords = allServiceRecords.filter(s => vehicleIds.includes(s.vehicle_id));
          
          setVehicles(userVehicles);
          setServiceRecords(userServiceRecords);
        }
      } else {
        setVehicles([]);
        setServiceRecords([]);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setUser(null);
      setVehicles([]);
      setServiceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSolanaPrice = async () => {
    setSolanaLoading(true);
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSolanaPrice(data.solana.usd);
    } catch (error) {
      console.error("Error fetching Solana price:", error);
      setSolanaPrice(null);
    } finally {
      setSolanaLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg md:text-xl">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || (!user.wallet_address && user.user_type !== 'admin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 md:p-6">
        <Card className="max-w-md bg-slate-800/50 border-red-500/30 backdrop-blur-xl">
          <CardContent className="p-6 md:p-8 text-center">
            <Shield className="w-12 h-12 md:w-16 md:h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-slate-300 mb-6 text-sm md:text-base">
              Please sign in and connect your wallet to access your dashboard.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl("Home")}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 w-full"
            >
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSpent = serviceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
  const avgServiceCost = serviceRecords.length > 0 ? totalSpent / serviceRecords.length : 0;
  const recentServices = serviceRecords.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-6 md:mb-8 pt-4 md:pt-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Customer Dashboard
              {user.user_type === 'admin' && (
                <span className="text-sm md:text-lg text-purple-400 ml-2">(Admin View)</span>
              )}
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">
              {user.user_type === 'admin' ? 'View all vehicles and service history' : 'Manage your vehicles and track service history'}
            </p>
          </div>
          
          <Link to={createPageUrl("RegisterVIN")}>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 md:px-6 py-3 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 border-0 w-full sm:w-auto text-sm md:text-base">
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Register New VIN</span>
              <span className="sm:hidden">Register VIN</span>
            </Button>
          </Link>
        </div>

        {!hasAccount && <WalletOnlyNotice />}
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
          >
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Car className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">Vehicles</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{hasAccount ? vehicles.length : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-slate-800/50 border-green-500/20 backdrop-blur-xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Wrench className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">Services</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{hasAccount ? serviceRecords.length : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-2 lg:col-span-1"
          >
            <Card className="bg-slate-800/50 border-yellow-500/20 backdrop-blur-xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">Total Spent</p>
                    <p className="text-lg md:text-2xl font-bold text-white">{hasAccount ? `$${totalSpent.toFixed(2)}` : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="col-span-2 lg:col-span-1"
          >
            <Card className="bg-slate-800/50 border-blue-500/20 backdrop-blur-xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">Avg Cost</p>
                    <p className="text-lg md:text-2xl font-bold text-white">{hasAccount ? `$${avgServiceCost.toFixed(2)}` : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="vehicles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-purple-500/20 p-1 h-auto">
            <TabsTrigger 
              value="vehicles" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
            >
              <Car className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">My Vehicles</span>
              <span className="sm:hidden">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger 
              value="services" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
            >
              <Wrench className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Service History</span>
              <span className="sm:hidden">Services</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
            >
              <UserIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {vehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <VehicleCard 
                    vehicle={vehicle} 
                    isOwner={true}
                    onClick={() => window.location.href = `${createPageUrl("Explorer")}?vin=${vehicle.vin}`}
                  />
                </motion.div>
              ))}
            </div>
            
            {vehicles.length === 0 && (
              <div className="text-center py-8 md:py-12">
                <Car className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-slate-400 mb-2">{hasAccount ? 'No vehicles registered yet' : 'Wallet connected'}</h3>
                <p className="text-slate-500 mb-6 text-sm md:text-base px-4">
                  {hasAccount ? 'Register your first VIN to get started with blockchain vehicle identity.' : 'Your private vehicle records are not loaded in a wallet-only session.'}
                </p>
                <Link to={createPageUrl("RegisterVIN")}>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Your First VIN
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg md:text-xl">Recent Service Records</CardTitle>
              </CardHeader>
              <CardContent>
                {recentServices.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <Wrench className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold text-slate-400 mb-2">{hasAccount ? 'No service records yet' : 'Private service records unavailable'}</h3>
                    <p className="text-slate-500 text-sm md:text-base">
                      {hasAccount ? 'Service records will appear here when certified shops perform work on your vehicles' : 'Wallet connection alone does not grant access to private account records.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentServices.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <Card className="bg-slate-700/30 border-slate-600/50">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white text-sm md:text-base">{record.shop_name}</h4>
                                <p className="text-slate-300 text-xs md:text-sm">{record.service_details}</p>
                              </div>
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs self-start" variant="outline">
                                {record.service_type.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs md:text-sm text-slate-400">
                              <span>{format(new Date(record.created_date), "MMM d, yyyy")}</span>
                              {record.cost && <span>${record.cost.toFixed(2)}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg md:text-xl flex items-center gap-2">
                    <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                    My Profile & Blockchain Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                      <h3 className="text-base md:text-lg font-semibold text-white mb-2">User Information</h3>
                      <div className="space-y-2 text-sm md:text-base">
                        <p className="text-slate-300">Name: {user?.full_name || "Not available"}</p>
                        <p className="text-slate-300">Email: {user?.email || "Not available"}</p>
                        <p className="text-slate-300 break-all">Wallet: {user?.wallet_address || "Not connected"}</p>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-base md:text-lg font-semibold text-white mb-2 flex items-center gap-2">
                          <img src="https://cryptologos.cc/logos/solana-sol-logo.png?v=026" alt="Solana Logo" className="w-4 h-4 md:w-5 md:h-5 rounded-full" />
                          Live Solana Price
                      </h3>
                      {solanaLoading ? (
                          <p className="text-slate-400 text-sm md:text-base">Loading Solana price...</p>
                      ) : solanaPrice !== null ? (
                          <p className="text-xl md:text-2xl font-bold text-green-400">${solanaPrice.toFixed(2)} USD</p>
                      ) : (
                          <p className="text-red-400 text-sm md:text-base">Failed to load Solana price. Please try again later.</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">Data from CoinGecko</p>
                  </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}