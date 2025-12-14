
import React, { useState, useEffect, useCallback } from 'react';
import { Vehicle } from '@/entities/Vehicle';
import { ServiceRecord } from '@/entities/ServiceRecord';
import { Invoice } from '@/entities/Invoice';
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
  User,
  Car,
  Wallet,
  FileText,
  Calendar,
  DollarSign,
  Shield,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

export default function CustomerDetailModal({ isOpen, onClose, customer }) {
  const [vehicles, setVehicles] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCustomerData = useCallback(async () => {
    if (!customer) return;

    setIsLoading(true);
    try {
      // Load customer's vehicles
      const customerVehicles = await Vehicle.filter({ owner_wallet: customer.wallet_address });
      setVehicles(customerVehicles);

      // Load service records for customer's vehicles
      const vehicleIds = customerVehicles.map(v => v.id);
      if (vehicleIds.length > 0) {
        const allServiceRecords = await ServiceRecord.list('-created_date');
        const customerServiceRecords = allServiceRecords.filter(record =>
          vehicleIds.includes(record.vehicle_id)
        );
        setServiceRecords(customerServiceRecords);
      } else {
        setServiceRecords([]);
      }

      // Load customer invoices
      const customerInvoices = await Invoice.filter({ customer_id: customer.id }, '-created_date');
      setInvoices(customerInvoices);

    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customer]); // `customer` is a dependency for `loadCustomerData`

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerData();
    }
  }, [isOpen, customer, loadCustomerData]); // `loadCustomerData` is now a dependency

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!customer) return null;

  const totalSpent = invoices.reduce((sum, invoice) => sum + (invoice.final_amount_vin * 0.10), 0); // Convert VIN to USD
  const totalServiceCost = serviceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            {customer.full_name || customer.email}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="services">Services ({serviceRecords.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm">Full Name</p>
                    <p className="text-white font-semibold">{customer.full_name || 'Not provided'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-400" />
                      <p className="text-white">{customer.email}</p>
                    </div>
                  </div>

                  {customer.phone && (
                    <div>
                      <p className="text-slate-400 text-sm">Phone</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <p className="text-white">{customer.phone}</p>
                      </div>
                    </div>
                  )}

                  {customer.address && (
                    <div>
                      <p className="text-slate-400 text-sm">Address</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-400" />
                        <p className="text-white">{customer.address}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-slate-400 text-sm">User Type</p>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {customer.user_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm">Member Since</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <p className="text-white">{format(new Date(customer.created_date), 'PPP')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-400" />
                    Wallet & Financial Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer.wallet_address && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Solana Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-white break-all flex-1">{customer.wallet_address}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(customer.wallet_address)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">Total Spent (USD)</p>
                      <p className="text-green-400 text-xl font-bold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${(totalSpent + totalServiceCost).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">VIN Balance</p>
                      <p className="text-blue-400 text-xl font-bold">
                        {customer.vin_token_balance || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">Vehicles Owned</p>
                      <p className="text-purple-400 text-xl font-bold flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        {vehicles.length}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">Services Received</p>
                      <p className="text-orange-400 text-xl font-bold">
                        {serviceRecords.length}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => window.open(`https://solscan.io/account/${customer.wallet_address}`, '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Wallet on Solscan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vehicles">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading vehicles...</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">No Vehicles Registered</h3>
                  <p className="text-slate-500">This customer hasn't registered any vehicles yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-white font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                            <p className="text-purple-300 font-mono text-sm">{vehicle.domain}</p>
                          </div>
                          <Badge className={
                            vehicle.status === 'active'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {vehicle.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">VIN:</span>
                            <span className="font-mono text-white">{vehicle.vin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Registered:</span>
                            <span className="text-white">{format(new Date(vehicle.created_date), 'MMM d, yyyy')}</span>
                          </div>
                          {vehicle.color && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Color:</span>
                              <span className="text-white">{vehicle.color}</span>
                            </div>
                          )}
                          {vehicle.mileage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Mileage:</span>
                              <span className="text-white">{vehicle.mileage.toLocaleString()} miles</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => window.open(`https://solscan.io/token/${vehicle.domain_nft_token_id}`, '_blank')}
                            className="bg-purple-600 hover:bg-purple-700 text-xs flex-1"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            View NFT
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(vehicle.vin)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading service records...</p>
                </div>
              ) : serviceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">No Service Records</h3>
                  <p className="text-slate-500">This customer hasn't received any service records yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceRecords.map((record) => {
                    const vehicle = vehicles.find(v => v.id === record.vehicle_id);
                    return (
                      <Card key={record.id} className="bg-slate-800/30 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-white font-semibold">{record.shop_name}</h4>
                              <p className="text-slate-300 text-sm">{record.service_details}</p>
                              {vehicle && (
                                <p className="text-slate-500 text-xs mt-1">
                                  {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.vin}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">
                                {record.service_type.replace(/_/g, ' ')}
                              </Badge>
                              {record.cost && (
                                <p className="text-green-400 font-semibold">${record.cost.toFixed(2)}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>{format(new Date(record.created_date), 'MMM d, yyyy')}</span>
                            {record.nft_token_id && (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">NFT Minted</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">No Invoices</h3>
                  <p className="text-slate-500">No invoice records found for this customer.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-white font-semibold">{invoice.invoice_number}</h4>
                            <p className="text-slate-300 text-sm">{invoice.description}</p>
                            <p className="text-slate-500 text-xs">{invoice.invoice_type.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              invoice.payment_status === 'paid'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }>
                              {invoice.payment_status}
                            </Badge>
                            <p className="text-green-400 font-bold mt-1">
                              ${(invoice.final_amount_vin * 0.10).toFixed(2)}
                            </p>
                            <p className="text-slate-400 text-xs">{invoice.final_amount_vin} VIN</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{format(new Date(invoice.created_date), 'MMM d, yyyy')}</span>
                          {invoice.transaction_hash && (
                            <span className="font-mono">{invoice.transaction_hash.substring(0, 10)}...</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 p-3 rounded-lg text-center">
                      <p className="text-green-400 text-2xl font-bold">${(totalSpent + totalServiceCost).toFixed(2)}</p>
                      <p className="text-slate-400 text-xs">Total Spent</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg text-center">
                      <p className="text-blue-400 text-2xl font-bold">{invoices.filter(i => i.payment_status === 'paid').length}</p>
                      <p className="text-slate-400 text-xs">Paid Invoices</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Registration Fees:</span>
                      <span className="text-white">${invoices.filter(i => i.invoice_type === 'vin_registration').reduce((sum, i) => sum + (i.final_amount_vin * 0.10), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Service Costs:</span>
                      <span className="text-white">${totalServiceCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">NFT Minting Fees:</span>
                      <span className="text-white">${invoices.filter(i => i.invoice_type === 'service_nft').reduce((sum, i) => sum + (i.final_amount_vin * 0.10), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-lg text-center">
                      <p className="text-purple-400 text-2xl font-bold">{vehicles.length}</p>
                      <p className="text-slate-400 text-xs">Vehicles</p>
                    </div>
                    <div className="bg-orange-500/10 p-3 rounded-lg text-center">
                      <p className="text-orange-400 text-2xl font-bold">{serviceRecords.length}</p>
                      <p className="text-slate-400 text-xs">Services</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Active Vehicles:</span>
                      <span className="text-white">{vehicles.filter(v => v.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">NFTs Received:</span>
                      <span className="text-white">{serviceRecords.filter(r => r.nft_token_id).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Member Since:</span>
                      <span className="text-white">{format(new Date(customer.created_date), 'MMM yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
            Close
          </Button>
          {customer.wallet_address && (
            <Button
              onClick={() => window.open(`https://solscan.io/account/${customer.wallet_address}`, '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Wallet
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
