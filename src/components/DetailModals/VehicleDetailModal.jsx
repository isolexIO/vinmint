
import React, { useState, useEffect, useCallback } from 'react';
import { ServiceRecord } from '@/entities/ServiceRecord';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Calendar,
  Wallet,
  ExternalLink,
  Copy,
  Shield,
  Wrench,
  Globe,
  History,
  DollarSign,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function VehicleDetailModal({ isOpen, onClose, vehicle }) {
  const [serviceRecords, setServiceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadServiceRecords = useCallback(async () => {
    if (!vehicle) return;
    
    setIsLoading(true);
    try {
      const records = await ServiceRecord.filter({ vehicle_id: vehicle.id }, '-created_date');
      setServiceRecords(records);
    } catch (error) {
      console.error('Error loading service records:', error);
      setServiceRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [vehicle]); // Added vehicle to useCallback dependencies

  useEffect(() => {
    if (isOpen && vehicle) {
      loadServiceRecords();
    }
  }, [isOpen, vehicle, loadServiceRecords]); // Added loadServiceRecords to useEffect dependencies

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!vehicle) return null;

  const totalServiceCost = serviceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="services">Services ({serviceRecords.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="w-5 h-5 text-purple-400" />
                    Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">VIN</p>
                      <p className="font-mono text-white">{vehicle.vin}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Year</p>
                      <p className="text-white">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Make</p>
                      <p className="text-white">{vehicle.make}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Model</p>
                      <p className="text-white">{vehicle.model}</p>
                    </div>
                    {vehicle.color && (
                      <>
                        <div>
                          <p className="text-slate-400">Color</p>
                          <p className="text-white">{vehicle.color}</p>
                        </div>
                      </>
                    )}
                    {vehicle.mileage && (
                      <div>
                        <p className="text-slate-400">Mileage</p>
                        <p className="text-white">{vehicle.mileage.toLocaleString()} miles</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-400 text-sm">Status</p>
                    <Badge className={
                      vehicle.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }>
                      {vehicle.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-400" />
                    Ownership & Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Current Owner Wallet</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-white break-all flex-1">{vehicle.owner_wallet}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(vehicle.owner_wallet)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Registration Date</p>
                    <p className="text-white">{format(new Date(vehicle.created_date), 'PPP')}</p>
                  </div>

                  {vehicle.previous_owners && vehicle.previous_owners.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Previous Owners ({vehicle.previous_owners.length})
                      </p>
                      <div className="space-y-1">
                        {vehicle.previous_owners.slice(-3).map((owner, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <p className="font-mono text-xs text-slate-500 break-all flex-1">{owner}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(owner)}
                              className="text-slate-500 hover:text-slate-300"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {vehicle.previous_owners.length > 3 && (
                          <p className="text-xs text-slate-600">+{vehicle.previous_owners.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="blockchain">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  Blockchain Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Solana Domain NFT</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-purple-300 text-lg">{vehicle.domain}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(vehicle.domain)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {vehicle.domain_nft_token_id && (
                  <div>
                    <p className="text-slate-400 text-sm mb-1">NFT Token ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-white break-all flex-1">{vehicle.domain_nft_token_id}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(vehicle.domain_nft_token_id)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(`https://solscan.io/account/${vehicle.owner_wallet}`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Solscan
                  </Button>
                  {vehicle.domain_nft_token_id && (
                    <Button
                      onClick={() => window.open(`https://solscan.io/token/${vehicle.domain_nft_token_id}`, '_blank')}
                      variant="outline"
                      className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      View NFT
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Service History</h3>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">Total: ${totalServiceCost.toFixed(2)}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading service records...</p>
                </div>
              ) : serviceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">No Service Records</h3>
                  <p className="text-slate-500">This vehicle has no recorded service history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceRecords.map((record) => (
                    <Card key={record.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-white font-semibold">{record.shop_name}</h4>
                            <p className="text-slate-300 text-sm">{record.service_details}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {record.service_type.replace(/_/g, ' ')}
                            </Badge>
                            {record.cost && (
                              <p className="text-green-400 font-semibold mt-1">${record.cost.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400 border-t border-slate-700 pt-3">
                          <div>
                            <p>Date</p>
                            <p className="text-white">{format(new Date(record.created_date), 'MMM d, yyyy')}</p>
                          </div>
                          <div>
                            <p>Mileage</p>
                            <p className="text-white">{record.mileage_at_service?.toLocaleString() || 'N/A'}</p>
                          </div>
                          {record.nft_token_id && (
                            <div>
                              <p>NFT Status</p>
                              <Badge className="bg-green-500/20 text-green-400 text-xs">Minted</Badge>
                            </div>
                          )}
                          <div>
                            <p>Warranty</p>
                            <p className="text-white">{record.warranty_months || 0} months</p>
                          </div>
                        </div>

                        {record.parts_replaced && record.parts_replaced.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-slate-400 text-xs mb-2">Parts Replaced:</p>
                            <div className="flex flex-wrap gap-1">
                              {record.parts_replaced.map((part, index) => (
                                <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                  {part}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.nft_token_id && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-green-400" />
                              <p className="text-green-300 text-sm">Service NFT: </p>
                              <code className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">{record.nft_token_id.substring(0, 20)}...</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(record.nft_token_id)}
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-400" />
                  Registration & Transfer History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-2 border-purple-500/50 pl-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <p className="text-white font-semibold">Vehicle Registered</p>
                      <Badge variant="outline" className="border-green-500/50 text-green-300 text-xs">Current</Badge>
                    </div>
                    <p className="text-slate-400 text-sm">{format(new Date(vehicle.created_date), 'PPP')}</p>
                    <p className="text-slate-300 text-sm">Owner: {vehicle.owner_wallet.substring(0, 20)}...</p>
                  </div>

                  {vehicle.previous_owners && vehicle.previous_owners.map((owner, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <p className="text-white font-semibold">Ownership Transfer #{vehicle.previous_owners.length - index}</p>
                      </div>
                      <p className="text-slate-300 text-sm">Previous Owner: {owner.substring(0, 20)}...</p>
                    </div>
                  ))}

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <p className="text-white font-semibold">Domain Created</p>
                    </div>
                    <p className="text-slate-300 text-sm">{vehicle.domain}</p>
                    <p className="text-slate-400 text-sm">Blockchain certificate minted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
            Close
          </Button>
          <Button
            onClick={() => window.open(`https://solscan.io/account/${vehicle.owner_wallet}`, '_blank')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Blockchain
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
