import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Calendar, 
  Shield, 
  ExternalLink, 
  History,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function VehicleCard({ vehicle, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group"
    >
      <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl hover:bg-slate-800/70 transition-all duration-300 cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg sm:text-xl font-semibold truncate">{vehicle.year} {vehicle.make} {vehicle.model}</div>
              <div className="text-sm font-mono text-purple-300 truncate">{vehicle.domain}</div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex-shrink-0">
              {vehicle.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-3 text-sm mb-4 flex-1">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="font-mono text-xs truncate">{vehicle.vin}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-xs">Reg. {format(new Date(vehicle.created_date), "MMM yyyy")}</span>
            </div>
            
            {vehicle.color && (
              <div className="flex items-center gap-2 text-slate-300">
                <div 
                  className={`w-4 h-4 rounded-full border-2 border-slate-500 flex-shrink-0`} 
                  style={{ 
                    backgroundColor: vehicle.color.toLowerCase() === "red" ? "#EF4444" : 
                                   vehicle.color.toLowerCase() === "blue" ? "#3B82F6" : 
                                   vehicle.color.toLowerCase() === "green" ? "#22C55E" : 
                                   vehicle.color.toLowerCase() === "black" ? "#000000" : 
                                   vehicle.color.toLowerCase() === "white" ? "#FFFFFF" : 
                                   vehicle.color.toLowerCase() === "silver" ? "#C0C0C0" : 
                                   vehicle.color.toLowerCase() === "gray" ? "#808080" : 
                                   vehicle.color.toLowerCase() === "yellow" ? "#EAB308" : 
                                   vehicle.color.toLowerCase() === "orange" ? "#F97316" : 
                                   vehicle.color.toLowerCase() === "brown" ? "#A52A2A" : "transparent" 
                  }} 
                />
                <span className="text-xs truncate">{vehicle.color}</span>
              </div>
            )}
            
            {vehicle.mileage && (
              <div className="flex items-center gap-2 text-slate-300">
                <Car className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs truncate">{vehicle.mileage.toLocaleString()} miles</span>
              </div>
            )}
          </div>

          {/* Owner Wallet Address */}
          <div className="p-3 bg-slate-700/30 rounded-lg mb-4">
            <div className="text-xs text-slate-400 mb-1">Owner Wallet</div>
            <div className="font-mono text-xs text-purple-300 break-all">{vehicle.owner_wallet}</div>
          </div>

          {/* Previous Owners */}
          {vehicle.previous_owners && vehicle.previous_owners.length > 0 && (
            <div className="p-3 bg-slate-700/30 rounded-lg mb-4">
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
          
          {/* Fixed Button Layout */}
          <div className="flex flex-col gap-2 mt-auto pt-3">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                if (vehicle.domain_nft_token_id) {
                  window.open(`https://solscan.io/token/${vehicle.domain_nft_token_id}`, '_blank');
                }
              }}
              disabled={!vehicle.domain_nft_token_id}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 text-xs py-2"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              <span className="hidden sm:inline">View on Solscan</span>
              <span className="sm:hidden">Solscan</span>
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(vehicle);
              }}
              className="w-full bg-slate-700 text-purple-200 hover:bg-slate-600 hover:text-white text-xs py-2"
            >
              <Wrench className="w-3 h-3 mr-2" />
              <span className="hidden sm:inline">Service History</span>
              <span className="sm:hidden">Services</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}