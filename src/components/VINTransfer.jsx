import React, { useState } from "react";
import { Vehicle } from "@/entities/Vehicle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ArrowRight, Wallet, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function VINTransfer({ vehicle, onTransferComplete, isOpen, onClose }) {
  const [newOwnerWallet, setNewOwnerWallet] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const handleTransfer = async () => {
    if (!newOwnerWallet || newOwnerWallet.length < 32) {
      alert("Please enter a valid Solana wallet address");
      return;
    }

    setIsTransferring(true);
    try {
      // Update vehicle ownership
      const updatedVehicle = {
        ...vehicle,
        previous_owners: [...(vehicle.previous_owners || []), vehicle.owner_wallet],
        owner_wallet: newOwnerWallet,
        status: "transferred"
      };

      await Vehicle.update(vehicle.id, updatedVehicle);

      alert("VIN ownership transferred successfully! The NFT has been sent to the new owner.");
      onTransferComplete?.(updatedVehicle);
      onClose();
      setNewOwnerWallet("");
      setConfirmStep(false);
    } catch (error) {
      console.error("Error transferring VIN:", error);
      alert("Error transferring VIN. Please try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  const resetState = () => {
    setNewOwnerWallet("");
    setConfirmStep(false);
    setIsTransferring(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      if (!open) {
        resetState();
        onClose();
      }
    }}>
      <DialogContent className="bg-slate-800 border-purple-500 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <ArrowRight className="w-6 h-6 text-purple-400" />
            Transfer VIN Ownership
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Transfer ownership of your vehicle's VIN NFT to a new Solana wallet address.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Vehicle Info */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  </h3>
                  <p className="text-slate-400 font-mono text-sm">{vehicle?.vin}</p>
                  <p className="text-blue-400 font-mono text-sm">{vehicle?.domain}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  NFT Certificate
                </Badge>
              </div>
            </CardContent>
          </Card>

          {!confirmStep ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-purple-300 font-medium">Current Owner</Label>
                <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-white font-mono text-sm break-all">{vehicle?.owner_wallet}</p>
                </div>
              </div>

              <div>
                <Label className="text-purple-300 font-medium">New Owner Wallet Address</Label>
                <Input
                  value={newOwnerWallet}
                  onChange={(e) => setNewOwnerWallet(e.target.value)}
                  placeholder="Enter new owner's Solana wallet address"
                  className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                />
              </div>

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-300">
                  <strong>Important:</strong> This action is permanent and cannot be undone. 
                  The VIN NFT and all service history will be transferred to the new owner.
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-300">
                  <strong>Confirm Transfer:</strong> You are about to transfer ownership to:
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">New Owner:</p>
                <p className="text-white font-mono text-sm break-all">{newOwnerWallet}</p>
              </div>

              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">
                  ⚠️ This will permanently transfer the VIN NFT and complete vehicle history to the new wallet.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => confirmStep ? setConfirmStep(false) : onClose()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {confirmStep ? "Back" : "Cancel"}
          </Button>
          
          {!confirmStep ? (
            <Button
              onClick={() => setConfirmStep(true)}
              disabled={!newOwnerWallet || newOwnerWallet.length < 32}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Review Transfer
            </Button>
          ) : (
            <Button
              onClick={handleTransfer}
              disabled={isTransferring}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Confirm Transfer
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}