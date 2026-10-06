import React, { useState, useEffect } from "react";
import { Vehicle } from "@/entities/Vehicle";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Check,
  AlertTriangle,
  Loader2,
  Upload,
  Sparkles,
  Shield,
  Globe,
  Tv,
  Database,
  Wrench,
  Wallet,
  DollarSign,
  Camera,
  RefreshCw,
  PlusCircle // Added PlusCircle for the updated button icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { registerVINDomain } from "@/functions/registerVINDomain.js";
import { getWalletBalance } from "@/functions/getWalletBalance.js";
import VinScanner from "../components/VinScanner";

// VIN Token Logo Component
const VinTokenLogo = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-5 h-5 rounded-full" />
);

export default function RegisterVIN() {
  const [formData, setFormData] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    owner_wallet: ""
  });
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState({ sol: 0, vin: 0 });
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Used for general loading and submitting state
  const [step, setStep] = useState("input"); // input, payment, checking, success
  const [generatedData, setGeneratedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(""); // Used for submission errors
  const [showVinScanner, setShowVinScanner] = useState(false);
  
  const registrationFeeVIN = 490; // 490 VIN tokens
  const registrationFeeUSD = 49.00; // $49.00 USD

  // Load user data and wallet balance on component mount
  useEffect(() => {
    const loadUserData = async () => {
        try {
            const userData = await User.me();
            setUser(userData);
            
            if (userData.wallet_address) {
              await loadWalletBalance(userData.wallet_address);
            }
        } catch(e) {
            console.error("User not logged in or failed to load user", e);
            setErrorMessage("Your account session could not be loaded. Please sign in again to continue.");
            if (e.status === 401 || e.response?.status === 401) {
              User.redirectToLogin(window.location.href);
            }
        }
    };
    loadUserData();
  }, []);

  const loadWalletBalance = async (walletAddress) => {
    setIsLoadingBalance(true);
    try {
      const response = await getWalletBalance({ walletAddress });
      if (response.data && response.data.success) {
        setWalletBalance({
          sol: response.data.solBalance || 0,
          vin: response.data.vinTokenBalance || 0
        });
      }
    } catch (error) {
      console.error("Error loading wallet balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Pre-fill wallet address once user is loaded and if the field is empty
  useEffect(() => {
    if (user?.wallet_address && !formData.owner_wallet) {
        setFormData(prev => ({ ...prev, owner_wallet: user.wallet_address }));
    }
  }, [user, formData.owner_wallet]);

  const handleVinScanned = (scannedVin) => {
    if (scannedVin && typeof scannedVin === 'string') {
      setFormData(prev => ({ ...prev, vin: scannedVin.toUpperCase() }));
      setErrorMessage("");
      setShowVinScanner(false);
    } else {
      setErrorMessage("Invalid VIN scanned. Please try again.");
      setShowVinScanner(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateVIN = (vin) => {
    if (!vin || typeof vin !== 'string') return false;
    return vin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
  };
  
  const validateSolanaAddress = (address) => {
    if (!address) return false;
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault(); // Prevent default form submission for this step
    if (!validateVIN(formData.vin)) {
      setErrorMessage("Please enter a valid 17-character VIN");
      return;
    }
    if (!formData.make || !formData.model || !formData.year) {
      setErrorMessage("Please fill in all required vehicle details (Make, Model, Year).");
      return;
    }

    const ownerWallet = formData.owner_wallet || user?.wallet_address;
    if (!ownerWallet) {
        setErrorMessage("Owner wallet address is missing. Please ensure your profile has a wallet address.");
        return;
    }
    
    if (!validateSolanaAddress(ownerWallet)) {
        setErrorMessage("Invalid Solana wallet address format.");
        return;
    }

    // Check if user has sufficient VIN balance
    if (walletBalance.vin < registrationFeeVIN) {
      setErrorMessage(`Insufficient VIN token balance. You need ${registrationFeeVIN} VIN tokens ($${registrationFeeUSD}) for VIN registration. Current balance: ${walletBalance.vin} VIN`);
      return;
    }

    setErrorMessage("");
    setStep("payment");
  };

  const handleSubmit = async () => {
    setIsLoading(true); // Renamed from isSubmitting
    setStep("checking");
    setErrorMessage(""); // Clear previous errors

    try {
      const walletAddress = formData.owner_wallet || user?.wallet_address;
      
      if (!walletAddress) {
          throw new Error("Owner wallet address could not be determined.");
      }

      const vehicleDataPayload = { // Kept existing payload definition
        vin: formData.vin,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        color: formData.color,
        mileage: parseInt(formData.mileage) || 0,
        owner_wallet: walletAddress,
        previous_owners: [],
        status: "active"
      };

      const response = await registerVINDomain({
        vin: formData.vin.toUpperCase(), // Ensure VIN is uppercase
        vehicleData: vehicleDataPayload
      });

      if (response.data.success) {
        setGeneratedData({
          ...response.data.vehicle,
          domain: response.data.domain,
          domain_nft_token_id: response.data.domain_nft_token_id,
          invoice: response.data.invoice
        });
        
        // Update local wallet balance
        setWalletBalance(prev => ({
          ...prev,
          vin: Math.max(0, prev.vin - registrationFeeVIN)
        }));
        
        setStep("success");
      } else {
        throw new Error(response.data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Error registering VIN:", error);
      
      if (error.response?.status === 400) {
        setErrorMessage(error.response.data.error || "Registration failed");
      } else if (error.response?.status === 402) {
        setErrorMessage(`Insufficient balance: ${error.response.data.error}`);
      } else {
        setErrorMessage(`Error: ${error.response?.data?.error || error.message}`);
      }
      
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto pt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-slate-800/50 border-green-500/30 backdrop-blur-xl shadow-2xl shadow-green-500/10">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  VIN Successfully Registered!
                </CardTitle>
                <p className="text-slate-300 text-lg mt-2">
                  Your vehicle now has a permanent identity on the Solana blockchain
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <Label className="text-green-400 font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Solana Domain NFT
                      </Label>
                      <div className="text-white font-mono text-lg mt-1">{generatedData.domain}</div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <Label className="text-purple-400 font-medium">Domain NFT Token ID</Label>
                      <div className="text-white font-mono text-xs mt-1 break-all">{generatedData.domain_nft_token_id}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <Label className="text-blue-400 font-medium">Owner Wallet (Solana)</Label>
                      <div className="text-white font-mono text-sm mt-1 break-all">{generatedData.owner_wallet}</div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <Label className="text-yellow-400 font-medium">Vehicle</Label>
                      <div className="text-white font-semibold mt-1">
                        {generatedData.year} {generatedData.make} {generatedData.model}
                      </div>
                    </div>
                  </div>
                </div>

                {generatedData.invoice && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <VinTokenLogo />
                      <Label className="text-green-400 font-medium">Payment Processed</Label>
                    </div>
                    <div className="text-sm text-green-300">
                      <p>Invoice: {generatedData.invoice.number}</p>
                      <p>Amount: {generatedData.invoice.amount_vin} VIN (${generatedData.invoice.amount_usd})</p>
                    </div>
                  </div>
                )}

                <Alert className="bg-green-500/10 border-green-500/20">
                  <Shield className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-300">
                    Your VIN NFT certificate has been minted on the Solana blockchain.
                    You can now receive service record NFTs from certified shops.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => window.location.href = createPageUrl("Explorer")}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    View in Explorer
                  </Button>

                  <Button
                    onClick={() => {
                      setStep("input");
                      setFormData({
                        vin: "",
                        make: "",
                        model: "",
                        year: "",
                        color: "",
                        mileage: "",
                        owner_wallet: ""
                      });
                      setGeneratedData(null);
                      setErrorMessage("");
                    }}
                    variant="outline"
                    className="flex-1 border-purple-500 text-purple-300 hover:bg-purple-500/20"
                  >
                    Register Another VIN
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            Register Your VIN
          </h1>
          <p className="text-slate-300 text-lg">
            Transform your vehicle into a Solana blockchain-verified digital asset
          </p>
        </div>
        
        <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <Car className="w-8 h-8 text-purple-400" />
                  Vehicle Information
                </CardTitle>
                <p className="text-slate-400">
                  Please provide your vehicle details to create your VIN NFT certificate
                </p>

                {/* Wallet Balance Display */}
                {user && (
                  <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        <Label className="text-purple-300">Your Wallet Balance</Label>
                      </div>
                      <Button
                        onClick={() => user.wallet_address && loadWalletBalance(user.wallet_address)}
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingBalance}
                        className="text-slate-400 hover:text-white p-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-800/50 rounded-md">
                        <p className="text-slate-400 text-xs mb-1">SOL</p>
                        {isLoadingBalance ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto text-purple-400" />
                        ) : (
                          <p className="text-white font-bold">{walletBalance.sol.toFixed(4)}</p>
                        )}
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <VinTokenLogo />
                          <p className="text-slate-400 text-xs">VIN</p>
                        </div>
                        {isLoadingBalance ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto text-green-400" />
                        ) : (
                          <p className="text-white font-bold">{walletBalance.vin.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    
                    {walletBalance.vin < registrationFeeVIN && (
                      <Alert className="mt-3 bg-red-500/10 border-red-500/20">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-300 text-sm">
                          Insufficient VIN balance. You need {registrationFeeVIN} VIN tokens for registration.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {errorMessage && (
                  <Alert className="bg-red-900/50 border-red-500/30 text-red-300 mb-6">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProceedToPayment} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="vin" className="text-purple-300 font-medium">
                        Vehicle Identification Number (VIN) *
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="vin"
                          value={formData.vin}
                          onChange={(e) => {
                            handleInputChange("vin", e.target.value.toUpperCase());
                            setErrorMessage("");
                          }}
                          placeholder="Enter 17-character VIN"
                          maxLength={17}
                          className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400 flex-1"
                          required
                        />
                        <Button
                          type="button"
                          onClick={() => setShowVinScanner(true)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                      </div>
                      {formData.vin && (
                        <div className="mt-2">
                          {validateVIN(formData.vin) ? (
                            <div className="flex items-center justify-between">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <Check className="w-3 h-3 mr-1" />
                                Valid VIN Format
                              </Badge>
                              <span className="text-slate-400 text-sm">
                                Will become: {formData.vin}.VINmint
                              </span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Invalid VIN format
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="make" className="text-purple-300 font-medium">Make *</Label>
                      <Select onValueChange={(value) => handleInputChange("make", value)} value={formData.make}>
                        <SelectTrigger className="bg-slate-700/50 border-purple-500/30 text-white mt-2">
                          <SelectValue placeholder="Select make" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                          {["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Hyundai"].map(make => (
                            <SelectItem key={make} value={make} className="text-white focus:bg-purple-500/20">
                              {make}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="model" className="text-purple-300 font-medium">Model *</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleInputChange("model", e.target.value)}
                        placeholder="e.g., Camry, Accord, F-150"
                        className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400 mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="year" className="text-purple-300 font-medium">Year *</Label>
                      <Select onValueChange={(value) => handleInputChange("year", value)} value={formData.year}>
                        <SelectTrigger className="bg-slate-700/50 border-purple-500/30 text-white mt-2">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                          {Array.from({length: 30}, (_, i) => 2024 - i).map(year => (
                            <SelectItem key={year} value={year.toString()} className="text-white focus:bg-purple-500/20">
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="color" className="text-purple-300 font-medium">Color</Label>
                      <Select onValueChange={(value) => handleInputChange("color", value)} value={formData.color}>
                        <SelectTrigger className="bg-slate-700/50 border-purple-500/30 text-white mt-2">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                          {["Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Yellow", "Orange"].map(color => (
                            <SelectItem key={color} value={color} className="text-white focus:bg-purple-500/20">
                              {color}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mileage" className="text-purple-300 font-medium">Current Mileage</Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={formData.mileage}
                        onChange={(e) => handleInputChange("mileage", e.target.value)}
                        placeholder="e.g., 45000"
                        className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400 mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="wallet" className="text-purple-300 font-medium">Owner's Solana Wallet</Label>
                      <Input
                        id="wallet"
                        value={formData.owner_wallet}
                        onChange={(e) => handleInputChange("owner_wallet", e.target.value)}
                        placeholder="Auto-filled from your profile"
                        className="bg-slate-700/50 border-purple-500/30 text-white placeholder-slate-400 mt-2"
                        readOnly
                      />
                    </div>
                  </div>

                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-300">
                      Registration creates your {formData.vin ? `${formData.vin}.VINmint` : 'VIN'} domain on Solana blockchain and costs {registrationFeeVIN} VIN tokens (${registrationFeeUSD} USD).
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    disabled={isLoading || !validateVIN(formData.vin) || !formData.make || !formData.model || !formData.year || (!formData.owner_wallet && !user?.wallet_address) || walletBalance.vin < registrationFeeVIN}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 border-0"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Proceed to Payment ({registrationFeeVIN} VIN)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "payment" && (
            <motion.div
                key="payment"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                            <Wallet className="w-8 h-8 text-purple-400" />
                            Confirm Registration Payment
                        </CardTitle>
                        <p className="text-slate-400">
                            Pay with VIN tokens to mint your .VINmint domain on the Solana blockchain.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-6 bg-slate-900/50 rounded-lg border border-purple-500/20 text-center">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <VinTokenLogo />
                                <p className="text-slate-300 text-lg">VIN Registration Fee</p>
                            </div>
                            <p className="text-4xl font-bold text-white my-2">{registrationFeeVIN} VIN</p>
                            <p className="text-purple-300 text-xl">≈ ${registrationFeeUSD} USD</p>
                            
                            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-slate-400 mb-1">Your Current Balance:</p>
                                <div className="flex items-center justify-center gap-2">
                                  <VinTokenLogo />
                                  <p className="text-lg font-bold text-green-400">{walletBalance.vin.toLocaleString()} VIN</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">After Payment: {(walletBalance.vin - registrationFeeVIN).toLocaleString()} VIN</p>
                            </div>
                        </div>
                        
                        <Alert className="bg-green-500/10 border-green-500/20">
                           <Shield className="h-4 w-4 text-green-500" />
                           <AlertDescription className="text-green-300">
                               Payment will be processed from your secure wallet automatically. Your .VINmint domain will be created instantly.
                           </AlertDescription>
                       </Alert>
                       
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setStep("input")}
                                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                Back to Edit
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading || walletBalance.vin < registrationFeeVIN}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 text-lg font-semibold"
                            >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Registering VIN... {/* Updated text as per patch */}
                                  </>
                                ) : (
                                  <>
                                    <PlusCircle className="w-5 h-5 mr-2" /> {/* Updated icon as per patch */}
                                    Register VIN & Mint NFT {/* Updated text as per patch */}
                                  </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )}
        
        {step === "checking" && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Processing VIN Registration</h2>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Verifying {formData.vin ? `${formData.vin}.VINmint` : 'VIN'} domain availability</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Processing payment ({registrationFeeVIN} VIN tokens)</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <span className="w-4 h-4" />
                <span>Minting Solana NFT certificate...</span>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      {showVinScanner && (
          <VinScanner
            onVinScanned={handleVinScanned}
            onClose={() => setShowVinScanner(false)}
          />
        )}
    </div>
  );
}