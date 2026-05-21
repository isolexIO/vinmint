
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/entities/User";
import { Vehicle } from "@/entities/Vehicle";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building,
  Car,
  Wrench,
  PlusCircle,
  AlertTriangle,
  ExternalLink,
  Eye,
  Loader2,
  Upload,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import ServiceHistoryModal from "../components/explorer/ServiceHistoryModal";
import BulkUploadModal from "../components/dealer/BulkUploadModal";
import DealerProfileManager from "../components/dealer/DealerProfileManager";

export default function DealerDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [allServiceRecords, setAllServiceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedVehicleServices, setSelectedVehicleServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (user.user_type !== 'dealer' && user.user_type !== 'admin') {
          window.location.href = createPageUrl("Home");
          return;
        }

        const [vehicleData, serviceData] = await Promise.all([
          user.user_type === 'admin' ? Vehicle.list() : Vehicle.filter({ dealer_id: user.id }),
          ServiceRecord.list()
        ]);

        setVehicles(vehicleData);
        setAllServiceRecords(serviceData);

      } catch (error) {
        console.error("Error loading dealer dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    const services = allServiceRecords.filter(sr => sr.vehicle_id === vehicle.id);
    setSelectedVehicleServices(services);
    setIsModalOpen(true);
  };

  const handleBulkUploadComplete = (results) => {
    const initialize = async () => {
      try {
        const user = await User.me();
        const [vehicleData, serviceData] = await Promise.all([
          user.user_type === 'admin' ? Vehicle.list() : Vehicle.filter({ dealer_id: user.id }),
          ServiceRecord.list()
        ]);
        setVehicles(vehicleData);
        setAllServiceRecords(serviceData);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };
    initialize();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'transferred': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'disputed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const totalServicesForInventory = allServiceRecords.filter(sr => vehicles.some(v => v.vin === sr.vin)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!currentUser || (currentUser.user_type !== 'dealer' && currentUser.user_type !== 'admin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg bg-red-900/50 border-red-500/30 text-red-300">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription>
            Access Denied. You must be a Dealer to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-6 md:mb-8 pt-4 md:pt-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Dealer Dashboard
              {currentUser.user_type === 'admin' && (
                <span className="text-sm md:text-lg text-purple-400 ml-2">(Admin View)</span>
              )}
            </h1>
            <p className="text-slate-300 text-sm md:text-lg">Manage your vehicle inventory and track digital identities</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowBulkUpload(true)}
              variant="outline"
              className="border-green-500/50 text-green-300 hover:bg-green-500/20 px-4 py-3 text-sm md:text-base"
            >
              <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Bulk Upload CSV</span>
              <span className="sm:hidden">Upload CSV</span>
            </Button>
            <Link to={createPageUrl("RegisterVIN")}>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 md:px-6 py-3 rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 w-full sm:w-auto text-sm md:text-base">
                <PlusCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                <span className="hidden sm:inline">Add Vehicle to Inventory</span>
                <span className="sm:hidden">Add Vehicle</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
            <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs md:text-sm">Total Vehicles</p>
                <p className="text-xl md:text-2xl font-bold text-white">{vehicles.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-green-500/20 backdrop-blur-xl">
            <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs md:text-sm">Total Service Records</p>
                <p className="text-xl md:text-2xl font-bold text-white">{totalServicesForInventory}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-yellow-500/20 backdrop-blur-xl sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs md:text-sm">Dealership</p>
                <p className="text-base md:text-lg font-bold text-white">{currentUser.full_name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-purple-500/20 p-1 h-auto">
            <TabsTrigger 
              value="inventory" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
            >
              <Car className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vehicle Inventory</span>
              <span className="sm:hidden">Inventory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs md:text-sm py-2"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dealer Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-purple-300 font-mono text-xs mt-1">{vehicle.domain}</p>
                      </div>
                      <Badge className={getStatusColor(vehicle.status)} variant="outline">
                        {vehicle.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-xs text-slate-400">
                      <p><span className="font-mono">{vehicle.vin}</span></p>
                      <p>Registered: {format(new Date(vehicle.created_date), "MMM d, yyyy")}</p>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewDetails(vehicle)} 
                        className="text-white hover:text-purple-300 text-xs flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      <Link to={`${createPageUrl("Explorer")}?vin=${vehicle.vin}`} className="flex-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-purple-200 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-white text-xs w-full"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Explorer
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl hidden md:block">
              <CardHeader>
                <CardTitle className="text-white text-xl">Vehicle Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-purple-500/20">
                      <TableHead className="text-slate-300">Vehicle</TableHead>
                      <TableHead className="text-slate-300">VIN</TableHead>
                      <TableHead className="text-slate-300 hidden lg:table-cell">.VINmint Domain</TableHead>
                      <TableHead className="text-slate-300 hidden xl:table-cell">Registered</TableHead>
                      <TableHead className="text-slate-300 text-center">Status</TableHead>
                      <TableHead className="text-right text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="border-b-slate-800 hover:bg-slate-700/20">
                        <TableCell className="font-medium text-white">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </TableCell>
                        <TableCell className="font-mono text-purple-300 text-xs">{vehicle.vin}</TableCell>
                        <TableCell className="font-mono text-blue-300 text-xs hidden lg:table-cell">{vehicle.domain}</TableCell>
                        <TableCell className="text-slate-400 hidden xl:table-cell">{format(new Date(vehicle.created_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(vehicle.status)} variant="outline">
                            {vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(vehicle)} className="text-white hover:text-purple-300">
                              <Eye className="w-4 h-4 mr-2" /> View
                            </Button>
                            <Link to={`${createPageUrl("Explorer")}?vin=${vehicle.vin}`}>
                              <Button variant="outline" size="sm" className="text-purple-200 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-white">
                                <ExternalLink className="w-4 h-4 mr-2" /> Explorer
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {vehicles.length === 0 && (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-400 mb-2">Your inventory is empty</h3>
                    <p className="text-slate-500">
                      Click "Add Vehicle to Inventory" or "Bulk Upload CSV" to register your first VIN.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Empty State for Mobile */}
            {vehicles.length === 0 && (
              <div className="text-center py-12 block md:hidden">
                <Car className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400 mb-2">Your inventory is empty</h3>
                <p className="text-slate-500 text-sm px-4">
                  Use "Add Vehicle" or "Upload CSV" to register your first VIN.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg md:text-xl">Dealer Profile</CardTitle>
                <p className="text-slate-400 text-sm">Manage your dealership information and settings.</p>
              </CardHeader>
              <CardContent>
                <DealerProfileManager user={currentUser} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onUploadComplete={handleBulkUploadComplete}
      />

      {selectedVehicle && (
        <ServiceHistoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          vehicle={selectedVehicle}
          serviceRecords={selectedVehicleServices}
        />
      )}
    </div>
  );
}
