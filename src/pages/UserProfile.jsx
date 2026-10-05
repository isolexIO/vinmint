import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  User as UserIcon, 
  Wallet, 
  Phone, 
  MapPin, 
  Mail,
  Edit3,
  Save,
  X,
  Shield,
  Store,
  Building,
  Car,
  Trash2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setEditData({
        full_name: userData.full_name || "",
        phone: userData.phone || "",
        address: userData.address || "",
        wallet_address: userData.wallet_address || ""
      });
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe(editData);
      await loadUserProfile(); // Refresh user data
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || "",
      wallet_address: user.wallet_address || ""
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
      base44.auth.logout("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please contact support.");
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case "shop_owner": return <Store className="w-6 h-6 text-purple-400" />;
      case "dealer": return <Building className="w-6 h-6 text-yellow-400" />;
      case "admin": return <Shield className="w-6 h-6 text-red-400" />;
      default: return <Car className="w-6 h-6 text-blue-400" />;
    }
  };

  const getUserTypeBadgeColor = (userType) => {
    switch (userType) {
      case "shop_owner": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "dealer": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            User Profile
          </h1>
          
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg hover:shadow-green-500/25 transition-all duration-300"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white border-2"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  {getUserTypeIcon(user.user_type)}
                </div>
                <div>
                  <h2 className="text-2xl text-white">{user.full_name || "Unnamed User"}</h2>
                  <Badge className={getUserTypeBadgeColor(user.user_type)} variant="outline">
                    {user.user_type?.replace('_', ' ') || 'Vehicle Owner'}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-purple-300 font-medium">Full Name</Label>
                    {isEditing ? (
                      <Input
                        value={editData.full_name}
                        onChange={(e) => setEditData(prev => ({...prev, full_name: e.target.value}))}
                        className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-white mt-2 p-2 bg-slate-700/30 rounded-md">
                        {user.full_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-purple-300 font-medium">Email</Label>
                    <p className="text-white mt-2 p-2 bg-slate-700/30 rounded-md flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-400" />
                      {user.email}
                    </p>
                  </div>

                  <div>
                    <Label className="text-purple-300 font-medium">Phone</Label>
                    {isEditing ? (
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData(prev => ({...prev, phone: e.target.value}))}
                        className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="text-white mt-2 p-2 bg-slate-700/30 rounded-md flex items-center gap-2">
                        <Phone className="w-4 h-4 text-purple-400" />
                        {user.phone || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-purple-300 font-medium">Address</Label>
                    {isEditing ? (
                      <Input
                        value={editData.address}
                        onChange={(e) => setEditData(prev => ({...prev, address: e.target.value}))}
                        className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        placeholder="Enter your address"
                      />
                    ) : (
                      <p className="text-white mt-2 p-2 bg-slate-700/30 rounded-md flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        {user.address || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallet Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Wallet Information</h3>
                <div className="space-y-6">
                  <div>
                    <Label className="text-purple-300 font-medium">Solana Wallet</Label>
                    {isEditing ? (
                      <Input
                        value={editData.wallet_address}
                        onChange={(e) => setEditData(prev => ({...prev, wallet_address: e.target.value}))}
                        className="bg-slate-700/50 border-purple-500/30 text-white mt-2 font-mono text-sm"
                        placeholder="Your Solana wallet address"
                      />
                    ) : (
                      <p className="text-white mt-2 p-2 bg-slate-700/30 rounded-md flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-purple-400" />
                        <span className="font-mono text-xs break-all">
                          {user.wallet_address || "Not connected"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
                <div className="flex flex-wrap gap-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30" variant="outline">
                    Profile Complete
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" variant="outline">
                    Member since {new Date(user.created_date).getFullYear()}
                  </Badge>
                  {user.user_type === 'admin' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30" variant="outline">
                      Administrator
                    </Badge>
                  )}
                </div>
              </div>

              {/* Danger Zone - Delete Account */}
              <div className="pt-6 border-t border-red-500/20">
                <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium mb-1">Delete Account</p>
                      <p className="text-slate-400 text-sm">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-red-500/30 text-white max-w-[95vw] sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              This action is <strong className="text-red-400">permanent and cannot be undone</strong>. All your data, including vehicles, service records, and wallet information, will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <p className="text-red-300 text-sm mb-3">
                To confirm, type <strong className="text-white">DELETE</strong> below:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-slate-700/50 border-red-500/30 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText !== "DELETE"}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}