import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertifiedShop } from "@/entities/CertifiedShop";
import { Plus, X } from 'lucide-react';

export default function ServiceManager({ shop, onUpdate }) {
    const [newService, setNewService] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const addService = async () => {
        if (!newService.trim() || !shop) return;

        setIsUpdating(true);
        try {
            const updatedServices = [...(shop.offered_services || []), newService.trim()];
            await CertifiedShop.update(shop.id, { offered_services: updatedServices });
            onUpdate(updatedServices);
            setNewService('');
            alert('Service added successfully!');
        } catch (error) {
            console.error('Error adding service:', error);
            alert('Error adding service. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const removeService = async (serviceToRemove) => {
        if (!shop) return;

        setIsUpdating(true);
        try {
            const updatedServices = shop.offered_services.filter(s => s !== serviceToRemove);
            await CertifiedShop.update(shop.id, { offered_services: updatedServices });
            onUpdate(updatedServices);
            alert('Service removed successfully!');
        } catch (error) {
            console.error('Error removing service:', error);
            alert('Error removing service. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-3">
                <Input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="Enter a service you offer (e.g., 'Oil Change Service', 'Brake Inspection')"
                    className="bg-slate-700/50 border-purple-500/30 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && addService()}
                />
                <Button
                    onClick={addService}
                    disabled={!newService.trim() || isUpdating}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg hover:shadow-green-500/25 transition-all duration-300 whitespace-nowrap"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                </Button>
            </div>

            {shop?.offered_services && shop.offered_services.length > 0 ? (
                <div>
                    <h4 className="text-white font-semibold mb-3">Current Services:</h4>
                    <div className="flex flex-wrap gap-3">
                        {shop.offered_services.map((service, index) => (
                            <Badge
                                key={index}
                                className="px-4 py-2 text-sm bg-slate-700/50 text-slate-200 border border-slate-600 hover:border-red-500/50 group cursor-pointer"
                                onClick={() => !isUpdating && removeService(service)}
                            >
                                {service}
                                <X className="w-3 h-3 ml-2 group-hover:text-red-400 transition-colors duration-200" />
                            </Badge>
                        ))}
                    </div>
                    <p className="text-slate-400 text-sm mt-2">Click on a service to remove it</p>
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className="text-slate-400">No services listed yet. Add some services to showcase what you offer!</p>
                </div>
            )}
        </div>
    );
}