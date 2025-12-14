
import React, { useState, useEffect, useCallback } from "react";
import { Vehicle } from "@/entities/Vehicle";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import VehicleCard from "../components/explorer/VehicleCard";
import ServiceHistoryModal from "../components/explorer/ServiceHistoryModal";

export default function Explorer() {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadVehicles = async () => {
    try {
      const data = await Vehicle.list("-created_date");
      setVehicles(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setIsLoading(false);
    }
  };

  const loadServiceRecords = async (vehicleId) => {
    try {
      const records = await ServiceRecord.filter({ vehicle_id: vehicleId }, "-created_date");
      setServiceRecords(records);
    } catch (error) {
      console.error("Error loading service records:", error);
      setServiceRecords([]);
    }
  };

  const filterVehicles = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const filtered = vehicles.filter(vehicle => 
      vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.year.toString().includes(searchQuery)
    );

    setFilteredVehicles(filtered);
  }, [searchQuery, vehicles]);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [searchQuery, vehicles, filterVehicles]);

  const handleVehicleSelect = async (vehicle) => {
    setSelectedVehicle(vehicle);
    await loadServiceRecords(vehicle.id);
    setShowModal(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    filterVehicles();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            VIN Explorer
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Search and explore registered vehicles, view their complete service histories, and verify authenticity on the blockchain.
          </p>
        </div>

        {/* Search Section */}
        <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl shadow-2xl shadow-purple-500/10 mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by VIN, domain, make, model, or year..."
                  className="pl-10 bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400 text-lg py-3"
                />
              </div>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 text-white"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </form>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                Total Registered: {vehicles.length}
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                Active Vehicles: {vehicles.filter(v => v.status === 'active').length}
              </Badge>
              <Badge variant="outline" className="border-green-500/30 text-green-300">
                With Service History: {vehicles.filter(v => v.service_count > 0).length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            {searchQuery ? `Search Results (${filteredVehicles.length})` : `All Registered Vehicles (${vehicles.length})`}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-slate-800/30 border-purple-500/20 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-700 rounded mb-4" />
                  <div className="h-4 bg-slate-700 rounded mb-2" />
                  <div className="h-4 bg-slate-700 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-slate-700 rounded" />
                    <div className="h-6 w-20 bg-slate-700 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <VehicleCard 
                    vehicle={vehicle}
                    onSelect={handleVehicleSelect}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {!isLoading && filteredVehicles.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Car className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              {searchQuery ? "No vehicles found" : "No vehicles registered yet"}
            </h3>
            <p className="text-slate-500">
              {searchQuery 
                ? "Try adjusting your search terms or browse all vehicles"
                : "Be the first to register your VIN on the blockchain"
              }
            </p>
          </motion.div>
        )}

        {/* Service History Modal */}
        <ServiceHistoryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          vehicle={selectedVehicle}
          serviceRecords={serviceRecords}
        />
      </div>
    </div>
  );
}
