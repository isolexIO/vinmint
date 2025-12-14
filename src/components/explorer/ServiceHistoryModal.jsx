
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  Calendar,
  User,
  Wrench,
  DollarSign,
  Gauge,
  Shield,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const BaseLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500">
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


const getServiceTypeColor = (type) => {
  const colors = {
    oil_change: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    brake_repair: 'bg-red-500/20 text-red-400 border-red-500/30',
    tire_replacement: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    engine_repair: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    transmission: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    inspection: 'bg-green-500/20 text-green-400 border-green-500/30',
    maintenance: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    accident_repair: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    other: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };
  return colors[type] || colors.other;
};

export default function ServiceHistoryModal({ isOpen, onClose, vehicle, serviceRecords }) {
  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-purple-500/20 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            Vehicle Details & Service History
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle Information */}
        <Card className="bg-slate-800/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-white">
              <Car className="w-6 h-6 text-purple-400" />
              {vehicle.year} {vehicle.make} {vehicle.model}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">VIN:</span>
                  <span className="font-mono text-white">{vehicle.vin}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SolanaLogo />
                  <span className="text-slate-300">Domain:</span>
                  <span className="font-mono text-purple-300">{vehicle.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Registered:</span>
                  <span className="text-white">{format(new Date(vehicle.created_date), "MMMM d, yyyy")}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Owner:</span>
                  <span className="font-mono text-xs text-blue-300 truncate">{vehicle.owner_wallet}</span>
                </div>
                {vehicle.mileage && (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300">Mileage:</span>
                    <span className="text-white">{vehicle.mileage.toLocaleString()} miles</span>
                  </div>
                )}
                {vehicle.color && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-600"></div>
                    <span className="text-slate-300">Color:</span>
                    <span className="text-white">{vehicle.color}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-purple-500/20 my-4" />

        {/* Service History */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-400" />
            Service History ({serviceRecords.length})
          </h3>

          {serviceRecords.length === 0 ? (
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-8 text-center">
                <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No service records found</p>
                <p className="text-slate-500 text-sm mt-2">
                  Service records will appear here when certified shops perform work on this vehicle
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {serviceRecords.map((record, index) => (
                <Card key={record.id} className="bg-slate-800/30 border-purple-500/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white">
                        {record.shop_name}
                      </CardTitle>
                      <Badge className={getServiceTypeColor(record.service_type)} variant="outline">
                        {record.service_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-slate-300">{record.service_details}</p>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-400" />
                          <span className="text-slate-400">Service Date:</span>
                          <span className="text-white">{format(new Date(record.created_date), "MMM d, yyyy")}</span>
                        </div>
                        {record.mileage_at_service && (
                          <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-yellow-400" />
                            <span className="text-slate-400">Mileage:</span>
                            <span className="text-white">{record.mileage_at_service.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {record.cost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-slate-400">Cost:</span>
                            <span className="text-white">${record.cost.toFixed(2)}</span>
                          </div>
                        )}
                        {record.warranty_months && (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-slate-400">Warranty:</span>
                            <span className="text-white">{record.warranty_months} months</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {record.parts_replaced && record.parts_replaced.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-sm">Parts Replaced:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.parts_replaced.map((part, i) => (
                            <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">
                              {part}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.nft_token_id ? (
                      <div className="bg-slate-700/40 p-3 rounded-lg mt-3">
                        <h5 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                          <SolanaLogo/> Solana NFT Details
                        </h5>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-400 flex items-center gap-2">
                            Token ID: 
                            <a 
                              href={`https://solscan.io/token/${record.nft_token_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-mono text-blue-400 hover:underline"
                            >
                              {record.nft_token_id.substring(0, 12)}...
                            </a>
                          </p>
                          <p className="text-slate-400 flex items-center gap-2">
                            Tx Hash: 
                            {record.nft_tx_hash ? (
                              <a 
                                href={`https://solscan.io/tx/${record.nft_tx_hash}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-mono text-blue-400 hover:underline truncate"
                              >
                                {record.nft_tx_hash.substring(0, 12)}...
                              </a>
                            ) : (
                              <span className="text-slate-500">Pending</span>
                            )}
                          </p>
                          <p className="text-slate-400 flex items-center gap-2">
                            Recipient: <span className="font-mono text-slate-300 truncate">{record.nft_recipient}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-700/50 mt-3">
                        <Clock className="w-3 h-3" />
                        <span>Solana NFT not yet minted for this record.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
