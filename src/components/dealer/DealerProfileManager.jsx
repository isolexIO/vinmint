import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Edit3,
  Save,
  X
} from 'lucide-react';
import AddressInput from "../AddressInput";

export default function DealerProfileManager({ user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        address: user?.address || '',
        business_license: user?.business_license || ''
    });

    const handleSave = async () => {
        if (!user) return;
        
        setIsSaving(true);
        try {
            await base44.auth.updateMe(editData);
            alert('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            full_name: user?.full_name || '',
            phone: user?.phone || '',
            address: user?.address || '',
            business_license: user?.business_license || ''
        });
        setIsEditing(false);
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

    if (!user) {
        return <div className="text-slate-400">Loading profile...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Status and Actions Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-600/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg">{user.full_name || 'Unnamed Dealer'}</h3>
                        <Badge className={getStatusColor(user.dealer_status)} variant="outline">
                            <Shield className="w-3 h-3 mr-1" />
                            {user.dealer_status || 'pending'}
                        </Badge>
                    </div>
                </div>
                
                {!isEditing ? (
                    <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                    >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                )}
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="text-white font-semibold">Business Information</h4>
                    
                    <div>
                        <Label className="text-purple-300 font-medium">Dealership Name</Label>
                        {isEditing ? (
                            <Input
                                value={editData.full_name}
                                onChange={(e) => setEditData(prev => ({...prev, full_name: e.target.value}))}
                                className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                placeholder="Enter dealership name"
                            />
                        ) : (
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                <Building className="w-4 h-4 text-purple-400" />
                                {user.full_name || "Not provided"}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-purple-300 font-medium">Business License</Label>
                        {isEditing ? (
                            <Input
                                value={editData.business_license}
                                onChange={(e) => setEditData(prev => ({...prev, business_license: e.target.value}))}
                                className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                placeholder="Enter business license number"
                            />
                        ) : (
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-400" />
                                {user.business_license || "Not provided"}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-purple-300 font-medium">Email</Label>
                        <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            {user.email}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-white font-semibold">Contact Information</h4>
                    
                    <div>
                        <Label className="text-purple-300 font-medium">Phone Number</Label>
                        {isEditing ? (
                            <Input
                                value={editData.phone}
                                onChange={(e) => setEditData(prev => ({...prev, phone: e.target.value}))}
                                className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                                placeholder="Enter phone number"
                            />
                        ) : (
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                                <Phone className="w-4 h-4 text-purple-400" />
                                {user.phone || "Not provided"}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-purple-300 font-medium">Address</Label>
                        {isEditing ? (
                            <AddressInput
                                label=""
                                value={editData.address}
                                onChange={(value) => setEditData(prev => ({...prev, address: value}))}
                                placeholder="Enter business address"
                                className="mt-2"
                            />
                        ) : (
                            <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-purple-400 mt-0.5" />
                                <span>{user.address || "Not provided"}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-purple-300 font-medium">Member Since</Label>
                        <div className="text-white mt-2 p-3 bg-slate-700/30 rounded-md flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            {user.created_date ? new Date(user.created_date).toLocaleDateString() : "Unknown"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Information */}
            {user.dealer_verification_date && (
                <Card className="bg-slate-700/30 border-green-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h5 className="text-white font-semibold">Verified Dealer</h5>
                                <p className="text-green-400 text-sm">
                                    Verified on {new Date(user.dealer_verification_date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {user.dealer_status === 'pending' && (
                <Card className="bg-yellow-500/10 border-yellow-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <h5 className="text-white font-semibold">Verification Pending</h5>
                                <p className="text-yellow-400 text-sm">
                                    Your dealer application is under review. You'll be notified once approved.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}