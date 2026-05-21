
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CertifiedShop } from "@/entities/CertifiedShop";
import { User } from "@/entities/User";
import AddressInput from "../AddressInput"; // New import
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Star
} from 'lucide-react';

export default function ShopProfileManager({ shop, currentUser, onShopUpdate, onServicesUpdate }) {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingServices, setIsEditingServices] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        shop_name: shop?.shop_name || '',
        address: shop?.address || '',
        phone: shop?.phone || '',
        email: shop?.email || '',
        specialties: shop?.specialties || []
    });
    const [offeredServices, setOfferedServices] = useState(shop?.offered_services || []);
    const [newService, setNewService] = useState('');

    const handleSaveProfile = async () => {
        if (!shop) return;
        
        setIsSaving(true);
        try {
            const updatedShop = await CertifiedShop.update(shop.id, editData);
            onShopUpdate(updatedShop);
            alert('Profile updated successfully!');
            setIsEditingProfile(false);
        } catch (error) {
            console.error('Error updating shop profile:', error);
            alert('Error updating profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveServices = async () => {
        if (!shop) return;
        
        setIsSaving(true);
        try {
            const updatedShop = await CertifiedShop.update(shop.id, {
                offered_services: offeredServices
            });
            onServicesUpdate(offeredServices);
            onShopUpdate(updatedShop);
            alert('Services updated successfully!');
            setIsEditingServices(false);
        } catch (error) {
            console.error('Error updating services:', error);
            alert('Error updating services. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelProfile = () => {
        setEditData({
            shop_name: shop?.shop_name || '',
            address: shop?.address || '',
            phone: shop?.phone || '',
            email: shop?.email || '',
            specialties: shop?.specialties || []
        });
        setIsEditingProfile(false);
    };

    const handleCancelServices = () => {
        setOfferedServices(shop?.offered_services || []);
        setNewService('');
        setIsEditingServices(false);
    };

    const handleSpecialtyToggle = (specialty) => {
        setEditData(prev => ({
            ...prev,
            specialties: prev.specialties.includes(specialty)
                ? prev.specialties.filter(s => s !== specialty)
                : [...prev.specialties, specialty]
        }));
    };

    const handleAddService = () => {
        if (newService.trim() && !offeredServices.includes(newService.trim())) {
            setOfferedServices([...offeredServices, newService.trim()]);
            setNewService('');
        }
    };

    const handleRemoveService = (serviceToRemove) => {
        setOfferedServices(offeredServices.filter(service => service !== serviceToRemove));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'revoked': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const specialtyOptions = [
        { id: "general_repair", label: "General Repair" },
        { id: "engine_specialist", label: "Engine Specialist" },
        { id: "transmission", label: "Transmission" },
        { id: "brake_specialist", label: "Brake Specialist" },
        { id: "electrical", label: "Electrical" },
        { id: "body_work", label: "Body Work" },
        { id: "tire_service", label: "Tire Service" },
        { id: "oil_change", label: "Oil Change" },
        { id: "inspection", label: "Inspection" }
    ];

    if (!shop) {
        return <div className="text-slate-400">Loading shop profile...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Status and Shop Info Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-600/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg">{shop.shop_name}</h3>
                        <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(shop.status)} variant="outline">
                                <Shield className="w-3 h-3 mr-1" />
                                {shop.status}
                            </Badge>
                            {shop.rating > 0 && (
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <span className="text-white font-bold text-sm">{shop.rating}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {!isEditingProfile ? (
                    <Button
                        onClick={() => setIsEditingProfile(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                    >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            onClick={handleCancelProfile}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                )}
            </div>

            {/* Business Information */}
            <Card className="bg-slate-700/30 border-purple-500/20">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-purple-300 font-medium">Shop Name</Label>
                            {isEditingProfile ? (
                                <Input
                                    value={editData.shop_name}
                                    onChange={(e) => setEditData(prev => ({...prev, shop_name: e.target.value}))}
                                    className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                />
                            ) : (
                                <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                    <Store className="w-4 h-4 text-purple-400" />
                                    {shop.shop_name}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-purple-300 font-medium">Certification ID</Label>
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-400" />
                                <span className="font-mono text-sm">{shop.certification_id}</span>
                            </div>
                        </div>

                        <div>
                            <Label className="text-purple-300 font-medium">Email</Label>
                            {isEditingProfile ? (
                                <Input
                                    type="email"
                                    value={editData.email}
                                    onChange={(e) => setEditData(prev => ({...prev, email: e.target.value}))}
                                    className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                />
                            ) : (
                                <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-purple-400" />
                                    {shop.email}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-purple-300 font-medium">Phone</Label>
                            {isEditingProfile ? (
                                <Input
                                    value={editData.phone}
                                    onChange={(e) => setEditData(prev => ({...prev, phone: e.target.value}))}
                                    className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                />
                            ) : (
                                <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-purple-400" />
                                    {shop.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label className="text-purple-300 font-medium">Address</Label>
                        {isEditingProfile ? (
                            <AddressInput
                                label=""
                                value={editData.address}
                                onChange={(value) => setEditData(prev => ({...prev, address: value}))}
                                placeholder="Shop's physical address"
                                className="mt-2"
                            />
                        ) : (
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-purple-400 mt-0.5" />
                                <span>{shop.address}</span>
                            </div>
                        )}
                    </div>

                    {/* Business Domain */}
                    <div>
                        <Label className="text-purple-300 font-medium">Business Domain</Label>
                        <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md">
                            <span className="font-mono text-sm text-green-400">{shop.business_domain}</span>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div>
                        <Label className="text-purple-300 font-medium">Member Since</Label>
                        <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            {shop.created_date ? new Date(shop.created_date).toLocaleDateString() : "Unknown"}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Specialties */}
            <Card className="bg-slate-700/30 border-purple-500/20">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Shop Specialties</CardTitle>
                </CardHeader>
                <CardContent>
                    {isEditingProfile ? (
                        <div className="grid md:grid-cols-3 gap-3">
                            {specialtyOptions.map((specialty) => (
                                <div key={specialty.id} className="flex items-center space-x-2 p-2 bg-slate-700/40 rounded-lg">
                                    <Checkbox
                                        id={specialty.id}
                                        checked={editData.specialties.includes(specialty.id)}
                                        onCheckedChange={() => handleSpecialtyToggle(specialty.id)}
                                        className="border-purple-400/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                    />
                                    <Label htmlFor={specialty.id} className="text-slate-200 text-sm font-medium">
                                        {specialty.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {shop.specialties && shop.specialties.length > 0 ? (
                                shop.specialties.map((specialty, index) => (
                                    <Badge key={index} variant="outline" className="border-purple-500/30 text-purple-300">
                                        {specialtyOptions.find(s => s.id === specialty)?.label || specialty.replace(/_/g, ' ')}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-slate-400">No specialties specified</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Offered Services */}
            <Card className="bg-slate-700/30 border-purple-500/20">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-white text-lg">Offered Services</CardTitle>
                    {!isEditingServices ? (
                        <Button
                            onClick={() => setIsEditingServices(true)}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Services
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSaveServices}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                onClick={handleCancelServices}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {isEditingServices ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    placeholder="Add a new service..."
                                    className="bg-slate-700/50 border-purple-500/30 text-white"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                                />
                                <Button
                                    onClick={handleAddService}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                {offeredServices.map((service, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/40 rounded-lg">
                                        <span className="text-white">{service}</span>
                                        <Button
                                            onClick={() => handleRemoveService(service)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {offeredServices.length === 0 && (
                                    <p className="text-slate-400 text-center py-4">No services added yet</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {shop.offered_services && shop.offered_services.length > 0 ? (
                                shop.offered_services.map((service, index) => (
                                    <div key={index} className="p-3 bg-slate-700/40 rounded-lg">
                                        <span className="text-white">{service}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-center py-4">No services specified</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Shop Stats */}
            <Card className="bg-slate-700/30 border-purple-500/20">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Shop Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-slate-700/40 rounded-lg">
                            <div className="text-2xl font-bold text-white">{shop.total_services || 0}</div>
                            <div className="text-slate-400 text-sm">Total Services</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/40 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-400">{shop.rating || 0}</div>
                            <div className="text-slate-400 text-sm">Rating</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/40 rounded-lg">
                            <div className="text-2xl font-bold text-green-400">{shop.specialties?.length || 0}</div>
                            <div className="text-slate-400 text-sm">Specialties</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/40 rounded-lg">
                            <div className="text-2xl font-bold text-blue-400">{shop.offered_services?.length || 0}</div>
                            <div className="text-slate-400 text-sm">Services</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
