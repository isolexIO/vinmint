import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { setupUserProfile } from "@/functions/setupUserProfile.js";
import { generateAndSaveWallet } from "@/functions/generateAndSaveWallet.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import AddressInput from "../components/AddressInput";
import { 
  User as UserIcon, 
  Store, 
  Shield, 
  Car, 
  Wallet,
  ArrowRight,
  CheckCircle,
  Building,
  DollarSign,
  Loader2,
  Sparkles,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { verifyInviteToken } from "@/functions/verifyInviteToken.js";

const VinTokenLogo = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-6 h-6 rounded-full" />
);

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); 
  const [userType, setUserType] = useState(null); 
  const [generatedWallet, setGeneratedWallet] = useState(null);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
  const [phone, setPhone] = useState(""); 
  const [address, setAddress] = useState(""); 
  const [shopData, setShopData] = useState({
    shop_name: "",
    business_license: "",
    address: "", 
    phone: "",   
    email: "",
    specialties: []
  });
  const [step, setStep] = useState(1); 
  const [isSaving, setIsSaving] = useState(false); 
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteToken, setInviteToken] = useState(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite_token');

    if (token) {
      setInviteToken(token);
      const verifyToken = async () => {
        try {
          const response = await verifyInviteToken({ token });
          if (response.data.success) {
            setUserType(response.data.user_type);
            setIsInvited(true);
            // Skip to wallet generation for invited users
            handleGenerateWallet(response.data.user_type);
          } else {
            setErrorMessage(response.data.error || "Invalid invite link.");
            setInviteToken(null);
          }
        } catch (error) {
          console.error("Error verifying invite token:", error);
          setErrorMessage("Error verifying invite link. It may be invalid or expired.");
          setInviteToken(null);
        } finally {
          setIsVerifyingToken(false);
        }
      };
      verifyToken();
    } else {
      setIsVerifyingToken(false);
    }
  }, []);

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    handleGenerateWallet(type);
  };

  const handleGenerateWallet = async (selectedUserType) => {
    setIsGeneratingWallet(true);
    setErrorMessage("");

    try {
      const response = await generateAndSaveWallet();
      
      if (response.data.success) {
        setGeneratedWallet({
          address: response.data.wallet_address,
          balance: {
            sol: response.data.balances?.sol || 0,
            vin: response.data.balances?.vin || 1500 // Give initial VIN balance for demo
          }
        });
        setStep(2);
      } else {
        throw new Error(response.data.error || "Failed to generate wallet");
      }
    } catch (error) {
      console.error("Error generating wallet:", error);
      setErrorMessage("Failed to generate wallet. Please try again.");
    } finally {
      setIsGeneratingWallet(false);
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    setShopData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSave = async (e) => { 
    e.preventDefault();
    setErrorMessage(""); 

    if (!generatedWallet) {
      setErrorMessage("Wallet generation is required before proceeding.");
      return;
    }

    // Check payment requirements for dealers and shops (if not invited)
    if (!isInvited && (userType === 'dealer' || userType === 'shop_owner')) {
      const registrationFee = 1500; // 1500 VIN tokens = $150
      if (generatedWallet.balance.vin < registrationFee) {
        setErrorMessage(`Insufficient VIN token balance. You need ${registrationFee} VIN tokens for registration. Current balance: ${generatedWallet.balance.vin} VIN`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const profilePayload = {
        user_type: userType,
        wallet_address: generatedWallet.address,
        ...(userType !== 'shop_owner' && { phone: phone }),
        ...(userType !== 'shop_owner' && { address: address }),
        ...(userType === 'shop_owner' && { shop_data: shopData }),
        ...(inviteToken && { invite_token: inviteToken })
      };

      const response = await setupUserProfile(profilePayload);

      if (response.data.success) {
        // Update local wallet balance if payment was processed
        if (!isInvited && (userType === 'dealer' || userType === 'shop_owner')) {
          setGeneratedWallet(prev => ({
            ...prev,
            balance: {
              ...prev.balance,
              vin: prev.balance.vin - 1500
            }
          }));
        }
        setStep(3); 
      } else {
        throw new Error(response.data.error || "Profile setup failed");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrorMessage(error.response?.data?.details || error.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
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

  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (isGeneratingWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <Key className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Generating Your Wallet</h2>
          <p className="text-slate-300 mb-4">Creating a secure Solana wallet for your account...</p>
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto pt-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            Complete Your Profile
          </h1>
          <p className="text-slate-300 text-lg">
            {step === 1 ? "Choose your account type and we'll generate a secure wallet for you" : "Complete your profile setup"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-center text-white">
                    What best describes you?
                  </CardTitle>
                  <p className="text-center text-slate-400">
                    We'll create a secure Solana wallet for you automatically
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className="bg-slate-700/50 border-blue-500/50 hover:border-blue-400/80 cursor-pointer transition-all duration-300 group h-full shadow-lg hover:shadow-xl"
                        onClick={() => handleUserTypeSelect("vehicle_owner")}
                      >
                        <CardContent className="p-8 text-center flex flex-col h-full">
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Car className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-3">Vehicle Owner</h3>
                          <p className="text-slate-200 leading-relaxed flex-grow">
                            I own vehicles and want to register my VINs, track service history, and manage my vehicle's blockchain identity.
                          </p>
                          <div className="mt-4">
                            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold w-full">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Wallet & Continue
                            </Button>
                          </div>
                          <p className="text-green-400 text-sm font-bold mt-2">FREE + Auto Wallet</p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className="bg-slate-700/50 border-yellow-500/50 hover:border-yellow-400/80 cursor-pointer transition-all duration-300 group h-full shadow-lg hover:shadow-xl"
                        onClick={() => handleUserTypeSelect("dealer")}
                      >
                        <CardContent className="p-8 text-center flex flex-col h-full">
                          <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Building className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-3">Dealer / Fleet Manager</h3>
                          <p className="text-slate-200 leading-relaxed flex-grow">
                            I manage a fleet or inventory of vehicles and need to track their digital identities and service histories.
                          </p>
                          <div className="mt-4">
                            <Button className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold w-full">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Wallet & Continue
                            </Button>
                          </div>
                          <div className="mt-2 text-center">
                            <p className="text-yellow-300 text-sm font-bold flex items-center justify-center gap-1">
                              <VinTokenLogo />
                              1500 VIN Registration Fee
                            </p>
                            <p className="text-slate-300 text-xs">Includes YourBusiness.VINmint domain</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className="bg-slate-700/50 border-purple-500/50 hover:border-purple-400/80 cursor-pointer transition-all duration-300 group h-full shadow-lg hover:shadow-xl"
                        onClick={() => handleUserTypeSelect("shop_owner")}
                      >
                        <CardContent className="p-8 text-center flex flex-col h-full">
                          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Store className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-3">Shop Owner</h3>
                          <p className="text-slate-200 leading-relaxed flex-grow">
                            I own an automotive service shop and want to issue verified service record NFTs to my customers.
                          </p>
                          <div className="mt-4">
                            <Button className="bg-purple-600 hover:bg-purple-500 text-white font-semibold w-full">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Wallet & Continue
                            </Button>
                          </div>
                          <div className="mt-2 text-center">
                            <p className="text-purple-300 text-sm font-bold flex items-center justify-center gap-1">
                              <VinTokenLogo />
                              1500 VIN Registration Fee
                            </p>
                            <p className="text-slate-300 text-xs">Includes YourShop.VINmint domain</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3">
                    {userType === "vehicle_owner" ? (
                      <>
                        <Car className="w-8 h-8 text-blue-400" />
                        Vehicle Owner Setup
                      </>
                    ) : userType === "shop_owner" ? (
                      <>
                        <Store className="w-8 h-8 text-purple-400" />
                        Shop Owner Setup
                      </>
                    ) : userType === "dealer" ? (
                      <>
                        <Building className="w-8 h-8 text-yellow-400" />
                        Dealer Setup
                      </>
                    ) : (
                      <>
                        <Shield className="w-8 h-8 text-red-400" />
                        Administrator Setup 
                      </>
                    )}
                  </CardTitle>

                  {/* Wallet Display */}
                  {generatedWallet && (
                    <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-2xl p-6 mt-4 border border-green-500/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-green-200 font-semibold">✅ Wallet Generated Successfully</h4>
                          <p className="text-green-100 text-sm font-mono">{generatedWallet.address}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-slate-400 text-xs mb-1">SOL Balance</p>
                          <p className="text-white text-lg font-bold">{generatedWallet.balance.sol.toFixed(4)}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <VinTokenLogo />
                            <p className="text-slate-400 text-xs">VIN Balance</p>
                          </div>
                          <p className="text-white text-lg font-bold">{generatedWallet.balance.vin.toLocaleString()}</p>
                        </div>
                      </div>

                      {!isInvited && (userType === "dealer" || userType === "shop_owner") && (
                        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
                          <p className="text-yellow-200 text-sm font-medium text-center">
                            Registration Fee: 1500 VIN tokens ({generatedWallet.balance.vin >= 1500 ? '✅ Sufficient Balance' : '❌ Insufficient Balance'})
                          </p>
                        </div>
                      )}

                      {isInvited && (
                        <div className="mt-4 p-3 bg-green-500/20 border border-green-400/50 rounded-lg">
                          <p className="text-green-200 text-sm font-medium text-center">
                            🎉 Admin Invitation - No registration fees will be charged
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    {userType !== "shop_owner" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-purple-200 font-medium text-base">Phone Number</Label>
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="bg-slate-700/60 border-purple-400/50 text-white mt-2 placeholder-slate-400 focus:border-purple-300"
                          />
                        </div>
                        <div>
                          <AddressInput
                            label="Address"
                            value={address}
                            onChange={setAddress}
                            placeholder="Your physical address"
                            className=""
                          />
                        </div>
                      </div>
                    )}

                    {userType === "shop_owner" && (
                      <>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-purple-200 font-medium text-base">Shop Name *</Label>
                            <Input
                              value={shopData.shop_name}
                              onChange={(e) => setShopData(prev => ({...prev, shop_name: e.target.value}))}
                              placeholder="Your business name"
                              className="bg-slate-700/60 border-purple-400/50 text-white mt-2 placeholder-slate-400 focus:border-purple-300"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-purple-200 font-medium text-base">Business License *</Label>
                            <Input
                              value={shopData.business_license}
                              onChange={(e) => setShopData(prev => ({...prev, business_license: e.target.value}))}
                              placeholder="Your business license number"
                              className="bg-slate-700/60 border-purple-400/50 text-white mt-2 placeholder-slate-400 focus:border-purple-300"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-purple-200 font-medium text-base">Business Email *</Label>
                            <Input
                              type="email"
                              value={shopData.email}
                              onChange={(e) => setShopData(prev => ({...prev, email: e.target.value}))}
                              placeholder="business@example.com"
                              className="bg-slate-700/60 border-purple-400/50 text-white mt-2 placeholder-slate-400 focus:border-purple-300"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-purple-200 font-medium text-base">Shop Phone Number</Label>
                            <Input
                              value={shopData.phone}
                              onChange={(e) => setShopData(prev => ({...prev, phone: e.target.value}))}
                              placeholder="(555) 123-4567"
                              className="bg-slate-700/60 border-purple-400/50 text-white mt-2 placeholder-slate-400 focus:border-purple-300"
                            />
                          </div>
                        </div>
                        <div>
                          <AddressInput
                            label="Shop Address"
                            value={shopData.address}
                            onChange={(value) => setShopData(prev => ({...prev, address: value}))}
                            placeholder="Your shop's physical address"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-purple-200 font-medium text-base mb-3 block">Shop Specialties</Label>
                          <div className="grid md:grid-cols-3 gap-3">
                            {specialtyOptions.map((specialty) => (
                              <div key={specialty.id} className="flex items-center space-x-2 p-2 bg-slate-700/40 rounded-lg">
                                <Checkbox
                                  id={specialty.id}
                                  checked={shopData.specialties.includes(specialty.id)}
                                  onCheckedChange={() => handleSpecialtyToggle(specialty.id)}
                                  className="border-purple-400/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                />
                                <Label htmlFor={specialty.id} className="text-slate-200 text-sm font-medium">
                                  {specialty.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Alert className="bg-yellow-500/20 border-yellow-400/50">
                          <Shield className="h-4 w-4 text-yellow-300" />
                          <AlertDescription className="text-yellow-200">
                            Your shop will need to be approved by VINmint administrators before you can issue service NFTs. 
                            This process typically takes 1-3 business days.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}

                    {errorMessage && (
                      <Alert className="bg-red-500/20 border-red-400/50">
                        <AlertDescription className="text-red-200 font-medium">{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={isSaving || (!isInvited && (userType === 'dealer' || userType === 'shop_owner') && (!generatedWallet || generatedWallet.balance.vin < 1500))}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 font-semibold"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete Setup
                            {!isInvited && (userType === 'dealer' || userType === 'shop_owner') && (
                              <span className="ml-2 text-xs">(1500 VIN)</span>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-slate-800/70 border-green-500/40 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-center text-white flex items-center justify-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    Profile Setup Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <p className="text-slate-200 text-lg">
                    Your profile and wallet have been successfully set up.
                  </p>

                  {generatedWallet && (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <p className="text-green-400 text-sm font-medium mb-2">✅ Your Secure Wallet</p>
                      <p className="text-slate-300 text-xs font-mono break-all">{generatedWallet.address}</p>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-slate-400">SOL Balance</p>
                          <p className="text-white font-bold">{generatedWallet.balance.sol.toFixed(4)}</p>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <div>
                            <p className="text-slate-400">VIN Balance</p>
                            <p className="text-white font-bold flex items-center gap-1">
                              <VinTokenLogo />
                              {generatedWallet.balance.vin.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isInvited && (
                     <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                      <p className="text-green-200 text-sm font-medium">
                        ✅ Your account has been created via admin invitation. Welcome to the platform!
                      </p>
                    </div>
                  )}
                  {userType === "shop_owner" && !isInvited && (
                    <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-4">
                      <p className="text-yellow-200 text-sm font-medium">
                        Please note: Your shop will need to be approved by VINmint administrators before you can issue service NFTs. 
                        This process typically takes 1-3 business days.
                      </p>
                    </div>
                  )}
                  {(userType === "dealer" || userType === "shop_owner") && !isInvited && (
                    <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <VinTokenLogo />
                        <p className="text-green-200 text-sm font-medium">
                          ✅ Registration fee of 1500 VIN tokens has been processed
                        </p>
                      </div>
                      <p className="text-green-200 text-sm">
                        🌐 Your .VINmint domain has been reserved
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      if (userType === 'shop_owner') {
                        navigate(createPageUrl("ShopDashboard"));
                      } else if (userType === 'dealer') {
                        navigate(createPageUrl("DealerDashboard"));
                      } else if (userType === 'admin') { 
                        navigate(createPageUrl("AdminPanel"));
                      } else { 
                        navigate(createPageUrl("CustomerDashboard"));
                      }
                    }}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white py-3 px-8 font-semibold"
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}