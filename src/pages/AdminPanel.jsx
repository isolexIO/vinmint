
import React, { useState, useEffect, useCallback } from "react";
import { CertifiedShop } from "@/entities/CertifiedShop";
import { Vehicle } from "@/entities/Vehicle";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { User } from "@/entities/User";
import { Invoice } from "@/entities/Invoice";
import { Reward } from "@/entities/Reward";
import { RewardSettings } from "@/entities/RewardSettings";
import { SystemConfig } from "@/entities/SystemConfig";
import { updateShopCoordinates } from "@/functions/updateShopCoordinates";
import { updateDealerCoordinates } from "@/functions/updateDealerCoordinates";
import { generateVaultWallet } from "@/functions/generateVaultWallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Car,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Database,
  Building,
  X,
  MapPin,
  RefreshCw,
  Wallet,
  DollarSign,
  Star,
  Loader2,
  KeyRound,
  Copy,
  QrCode,
  ExternalLink,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  PlusCircle,
  UserPlus,
  Store,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Key,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReceiveModal from "../components/wallet/ReceiveModal";
import { generateInviteLink } from "@/functions/generateInviteLink";
import AddressInput from "../components/AddressInput";

// Solana Logo for UI
const SolanaLogoSmall = () => (
    <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#solana-gradient-small-admin)" />
      <defs><linearGradient id="solana-gradient-small-admin" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
    </svg>
);

const VinTokenLogoSmall = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-5 h-5 rounded-full" />
);

export default function AdminPanel() {
  const [shops, setShops] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vaultBalances, setVaultBalances] = useState({ sol: 0, vin: 0 });
  const [rewards, setRewards] = useState([]);
  const [rewardSettings, setRewardSettings] = useState([]);
  const [vaultConfig, setVaultConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingCoordinates, setIsUpdatingCoordinates] = useState(false);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isGeneratingVault, setIsGeneratingVault] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showVaultReceiveModal, setShowVaultReceiveModal] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState('');
  const [inviteMethod, setInviteMethod] = useState('link'); // 'link' or 'instant'
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    business_name: '',
    business_license: '',
    phone: '',
    address: '', // User's personal address
    shop_address: '', // Shop's business address (for shop owners)
  });
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);

  // Vault distribution form
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributionForm, setDistributionForm] = useState({
    recipientAddress: '',
    amount: '',
    reason: '',
    tokenType: 'VIN'
  });

  // Real analytics state based on actual invoices
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    monthlyGrowth: 0,
    customersByType: {},
    recentRegistrations: [],
    nftTrends: {},
    revenueBreakdown: {},
    topCustomers: [],
    vinVaultBalance: 0 // Added this for the card in the outline
  });

  // Simple wallet address validation function
  const validateSolanaAddress = (address) => {
    if (!address || typeof address !== 'string') return false;
    // Basic Solana address validation - should be 32-44 characters, Base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  };

  const handleAddNew = (type) => {
    setInviteType(type);
    setInviteMethod('link'); // Default to link invitation
    setGeneratedLink(null); // Reset generated link
    setInviteForm({ // Reset invite form
      email: '',
      full_name: '',
      business_name: '',
      business_license: '',
      phone: '',
      address: '',
      shop_address: '', // Reset shop address
    });
    setShowInviteModal(true);
  };

  const loadVaultData = useCallback(async () => {
    setIsLoadingVault(true);
    try {
      const { manageVinVault } = await import('@/functions/manageVinVault');
      const response = await manageVinVault({ action: 'balance' });
      if (response.data.success) {
        setVaultBalances({
          sol: response.data.solBalance || 0,
          vin: response.data.vinBalance || 0,
        });
      } else if (response.data.error && response.data.error.includes("not configured")) {
        setVaultConfig(null);
        setVaultBalances({ sol: 0, vin: 0 }); // Clear balances if not configured
      }
    } catch (error) {
      console.error("Error loading vault data:", error);
      setVaultBalances({ sol: 0, vin: 0 });
    } finally {
      setIsLoadingVault(false);
    }
    // Also fetch config
    try {
      const configs = await SystemConfig.filter({ config_key: 'vin_vault' });
      setVaultConfig(configs.length > 0 ? configs[0] : null);
    } catch (error) {
      console.error('Error fetching vault config:', error);
      setVaultConfig(null);
    }
  }, []);

  const loadRewardsData = useCallback(async () => {
    try {
      const [rewardsData, settingsData] = await Promise.all([
        Reward.list("-created_date", 50),
        RewardSettings.list()
      ]);
      setRewards(rewardsData);
      setRewardSettings(settingsData);
    } catch (error) {
      console.error("Error loading rewards data:", error);
    }
  }, []);

  const calculateRealAnalytics = useCallback((vehiclesData, serviceData, usersData, invoicesData) => {
    // Calculate actual revenue from paid invoices
    const paidInvoices = invoicesData.filter(inv => inv.payment_status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount_usd || 0), 0);

    // Calculate monthly growth (new paid invoices in the last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentInvoices = paidInvoices.filter(inv => new Date(inv.created_date) >= thirtyDaysAgo);
    const monthlyGrowth = recentInvoices.length;

    // Customer breakdown by type
    const customersByType = {
      vehicle_owners: usersData.filter(u => u.user_type === 'vehicle_owner').length,
      dealers: usersData.filter(u => u.user_type === 'dealer').length,
      shop_owners: usersData.filter(u => u.user_type === 'shop_owner').length,
      admins: usersData.filter(u => u.user_type === 'admin').length
    };

    // Recent registrations based on actual invoices (last 7 days)
    const recentRegistrations = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const count = paidInvoices.filter(inv => {
        const createdDate = new Date(inv.created_date);
        return createdDate >= dayStart && createdDate <= dayEnd && inv.invoice_type === 'vin_registration';
      }).length;

      recentRegistrations.push({
        date: format(date, 'MMM dd'),
        count
      });
    }

    // NFT trends from actual service records
    const nftTrends = {
      totalMinted: serviceData.filter(s => s.nft_token_id).length,
      pendingMint: serviceData.filter(s => !s.nft_token_id).length,
      thisMonth: serviceData.filter(s =>
        s.nft_token_id && new Date(s.created_date) >= thirtyDaysAgo
      ).length
    };

    // Revenue breakdown by service type
    const revenueBreakdown = {
      vin_registration: paidInvoices.filter(inv => inv.invoice_type === 'vin_registration').reduce((sum, inv) => sum + (inv.amount_usd || 0), 0),
      service_nft: paidInvoices.filter(inv => inv.invoice_type === 'service_nft').reduce((sum, inv) => sum + (inv.amount_usd || 0), 0),
      transfer_fee: paidInvoices.filter(inv => inv.invoice_type === 'transfer_fee').reduce((sum, inv) => sum + (inv.amount_usd || 0), 0),
      business_registration: paidInvoices.filter(inv => inv.invoice_type === 'business_registration').reduce((sum, inv) => sum + (inv.amount_usd || 0), 0)
    };

    // Top customers by spending
    const customerSpending = {};
    paidInvoices.forEach(inv => {
      if (!inv.customer_id) return;

      if (!customerSpending[inv.customer_id]) {
        customerSpending[inv.customer_id] = {
          customer_id: inv.customer_id,
          customer_email: inv.customer_email || 'N/A',
          total_spent: 0,
          invoice_count: 0
        };
      }
      customerSpending[inv.customer_id].total_spent += (inv.amount_usd || 0);
      customerSpending[inv.customer_id].invoice_count += 1;
    });

    const topCustomers = Object.values(customerSpending)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5);

    return {
      totalRevenue,
      monthlyGrowth,
      customersByType,
      recentRegistrations,
      nftTrends,
      revenueBreakdown,
      topCustomers,
      // vinVaultBalance will be updated by a separate useEffect
      vinVaultBalance: 0
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (user.user_type !== 'admin') {
        window.location.href = createPageUrl("CustomerDashboard");
        return;
      }

      await loadVaultData(); // Load vault config and balances
      await loadRewardsData();

      const [shopsData, vehiclesData, serviceRecordsData, dealersData, allUsersData, invoicesData] = await Promise.all([
        CertifiedShop.list("-created_date"),
        Vehicle.list("-created_date"),
        ServiceRecord.list("-created_date"),
        User.filter({ user_type: 'dealer' }, "-created_date"),
        User.list("-created_date"),
        Invoice.list("-created_date") // Load actual invoices
      ]);

      setShops(shopsData);
      setVehicles(vehiclesData);
      setServiceRecords(serviceRecordsData);
      setDealers(dealersData);
      setAllUsers(allUsersData);
      setInvoices(invoicesData); // Set invoices state

      // Calculate real analytics from actual data (without vault balance initially)
      const analyticsData = calculateRealAnalytics(vehiclesData, serviceRecordsData, allUsersData, invoicesData);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadRewardsData, loadVaultData, calculateRealAnalytics]); // Removed vaultBalances from dependencies

  useEffect(() => {
    loadData();
  }, [loadData]);

  // New useEffect to sync vault balance with analytics without re-fetching all data
  useEffect(() => {
    setAnalytics(prev => ({
        ...prev,
        vinVaultBalance: vaultBalances.vin
    }));
  }, [vaultBalances]);

  const copySecretKey = () => {
    if (vaultConfig?.secret_key) {
      const secretKeyString = JSON.stringify(vaultConfig.secret_key);
      navigator.clipboard.writeText(secretKeyString);
      alert("Secret key copied to clipboard!");
    }
  };

  const handleGenerateVault = async () => {
    setIsGeneratingVault(true);
    try {
      const response = await generateVaultWallet();
      if (response.data.success) {
        alert(`Vault wallet generated successfully! Address: ${response.data.publicKey}`);
        await loadData();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error generating vault wallet:", error);
      alert("Failed to generate vault wallet: " + error.message);
    } finally {
      setIsGeneratingVault(false);
    }
  };

  const handleDistributeTokens = async () => {
    if (!distributionForm.recipientAddress || !distributionForm.amount) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate amount is positive
    const amount = parseFloat(distributionForm.amount);
    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    // Validate wallet address format
    if (!validateSolanaAddress(distributionForm.recipientAddress)) {
      alert("Invalid recipient wallet address format");
      return;
    }

    // Check if vault balance is sufficient
    const tokenSymbol = distributionForm.tokenType.toLowerCase();
    const currentBalance = vaultBalances[tokenSymbol];
    if (currentBalance < amount) {
      alert(`❌ Insufficient vault balance for ${distributionForm.tokenType}.\n\nAvailable: ${currentBalance} ${distributionForm.tokenType}\nRequested: ${amount} ${distributionForm.tokenType}\n\nPlease fund the vault first using the 'Receive Funds' option.`);
      return;
    }

    setIsLoadingVault(true);
    try {
      const { manageVinVault } = await import('@/functions/manageVinVault');
      const response = await manageVinVault({
        action: 'distribute',
        recipientAddress: distributionForm.recipientAddress,
        amount: amount,
        reason: distributionForm.reason,
        tokenType: distributionForm.tokenType
      });

      if (response.data.success) {
        alert(`Successfully distributed ${amount} ${distributionForm.tokenType}!\n\nTransaction: ${response.data.transaction_hash}`);
        setDistributionForm({ recipientAddress: '', amount: '', reason: '', tokenType: 'VIN' });
        setShowDistributionModal(false);
        loadVaultData(); // Refresh vault balance
        loadRewardsData();
      } else {
        // This 'else' block will now correctly handle 400-level errors from the backend
        const errorMsg = response.data.error || 'Distribution failed';
        const suggestion = response.data.suggestion ? `\n\nSuggestion: ${response.data.suggestion}` : '';
        throw new Error(`${errorMsg}${suggestion}`);
      }
    } catch (error) {
      console.error("Error distributing tokens:", error);

      let userMessage = "Failed to distribute tokens.";

      // Check for specific error strings from backend response
      const errorMessage = error.response?.data?.error || error.message;

      if (errorMessage.includes('Insufficient token balance') || errorMessage.includes('insufficient VIN token balance')) {
        userMessage = `❌ Vault Balance Too Low\n\nThe vault doesn't have enough ${distributionForm.tokenType} to complete this distribution. Please use the 'Receive Funds' button to add more tokens.`;
      } else if (errorMessage.includes('Insufficient SOL balance') || errorMessage.includes('Transaction simulation failed')) {
        userMessage = `❌ Insufficient SOL for Fees\n\nThe vault needs SOL to pay for network fees. Please send at least 0.002 SOL to the vault address. NFT minting and token distributions will fail otherwise.`;
      } else if (errorMessage.includes('Invalid recipient wallet address')) {
        userMessage = "❌ Invalid Wallet Address\n\nPlease check that the recipient wallet address is a valid Solana address.";
      } else if (errorMessage.includes('not configured')) {
        userMessage = "❌ Vault Not Configured\n\nPlease generate a vault wallet first from the 'VIN Vault & Rewards' tab.";
      } else {
        userMessage = `❌ Distribution Failed\n\n${errorMessage}`;
      }

      alert(userMessage);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleUpdateShopStatus = async (shopId, status) => {
    try {
      await CertifiedShop.update(shopId, {
        status,
        verification_date: status === 'approved' ? new Date().toISOString().split('T')[0] : null
      });
      alert(`Shop ${status} successfully!`);
      loadData();
    } catch (error) {
      console.error("Error updating shop:", error);
      alert("Error updating shop. Please try again.");
    }
  };

  const handleUpdateDealerStatus = async (dealerId, status) => {
    try {
      await User.update(dealerId, {
        dealer_status: status,
        dealer_verification_date: status === 'approved' ? new Date().toISOString().split('T')[0] : null
      });
      alert(`Dealer ${status} successfully!`);
      loadData();
    } catch (error) {
      console.error("Error updating dealer:", error);
      alert("Error updating dealer. Please try again.");
    }
  };

  const handleUpdateMapCoordinates = async () => {
    setIsUpdatingCoordinates(true);
    try {
      const [shopResponse, dealerResponse] = await Promise.all([
        updateShopCoordinates(),
        updateDealerCoordinates()
      ]);

      if (shopResponse.data.success && dealerResponse.data.success) {
        alert(`Geocoding complete!\n\nShops: ${shopResponse.data.message}\nDealers: ${dealerResponse.data.message}`);
        loadData();
      } else {
        let errorMessage = "Geocoding failed. ";
        if (shopResponse && !shopResponse.data.success) errorMessage += `Shop error: ${shopResponse.data.error || 'Unknown'}. `;
        if (dealerResponse && !dealerResponse.data.success) errorMessage += `Dealer error: ${dealerResponse.data.error || 'Unknown'}.`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error geocoding addresses:", error);
      alert("Error geocoding addresses: " + error.message);
    } finally {
      setIsUpdatingCoordinates(false);
    }
  };

  const handleGenerateInvite = async () => {
    setIsProcessingInvite(true);
    setGeneratedLink(null); // Clear previous link
    try {
      const response = await generateInviteLink({ user_type: inviteType === 'Shop Owner' ? 'shop_owner' : 'dealer' });
      if (response.data.success) {
        const url = `${window.location.origin}${createPageUrl("ProfileSetup")}?invite_token=${response.data.token}`;
        setGeneratedLink(url);
      } else {
        throw new Error(response.data.error || "Failed to generate link");
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      alert('Failed to generate invite link. Please try again.');
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleInstantRegistration = async () => {
    const requiredFields = ['email', 'full_name'];
    if (inviteType === 'Shop Owner') {
      requiredFields.push('business_name', 'business_license', 'shop_address');
    }
    // 'address' (personal address) is optional for shop owners, but required for dealers if they choose to provide it.
    // Making it required for all instant registrations for simplicity.
    requiredFields.push('address');

    const missingFields = requiredFields.filter(field => {
      // Check for nested fields if inviteType === 'Shop Owner'
      if (field === 'shop_address' && inviteType === 'Shop Owner') {
        return !inviteForm.shop_address;
      }
      return !inviteForm[field];
    });

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Wallet address will be auto-generated, no manual input or validation needed here.

    setIsProcessingInvite(true);
    try {
      const { adminCreateUser } = await import('@/functions/adminCreateUser');

      const userData = {
        email: inviteForm.email,
        full_name: inviteForm.full_name,
        user_type: inviteType === 'Shop Owner' ? 'shop_owner' : 'dealer',
        phone: inviteForm.phone || null,
        address: inviteForm.address || null, // User's personal address
        // wallet_address will be auto-generated by adminCreateUser function
        ...(inviteType === 'Dealer' && {
          business_name: inviteForm.business_name || null, // Now included for dealers
          business_license: inviteForm.business_license || `DLR_${Date.now()}`
        }),
        ...(inviteType === 'Shop Owner' && {
          shop_data: {
            shop_name: inviteForm.business_name,
            business_license: inviteForm.business_license,
            email: inviteForm.email,
            phone: inviteForm.phone || null,
            address: inviteForm.shop_address || null, // Shop's business address
            specialties: []
          }
        })
      };

      const response = await adminCreateUser(userData);

      if (response.data.success) {
        alert(`${inviteType} account created successfully! A new wallet has been generated for them. Business domain: ${response.data.business_domain}`);
        setShowInviteModal(false);
        loadData(); // Refresh the data
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create account: ' + error.message);
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'suspended': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'revoked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const stats = {
    totalVehicles: vehicles.length,
    totalShops: shops.length,
    approvedShops: shops.filter(s => s.status === 'approved').length,
    pendingShops: shops.filter(s => s.status === 'pending').length,
    totalDealers: dealers.length,
    approvedDealers: dealers.filter(d => d.dealer_status === 'approved').length,
    pendingDealers: dealers.filter(d => d.dealer_status === 'pending').length,
    totalServices: serviceRecords.length,
    thisMonthServices: serviceRecords.filter(s =>
      new Date(s.created_date).getMonth() === new Date().getMonth()
    ).length,
    nftsMinted: serviceRecords.filter(s => s.nft_token_id).length,
    shopsWithCoordinates: shops.filter(s => s.latitude && s.longitude).length,
    dealersWithCoordinates: dealers.filter(d => d.latitude && d.longitude).length,
    totalRewardsDistributed: rewards.length,
    totalVinDistributed: rewards.reduce((sum, r) => sum + (r.amount || 0), 0),
    totalCustomers: allUsers.length,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(inv => inv.payment_status === 'paid').length
  };

  if (isLoading || currentUser === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/ff9fce36a_493130015_122093779586861598_4848437929607844438_n.jpg"
            alt="VINmint Logo"
            className="w-16 h-16 mx-auto mb-4 rounded-xl animate-pulse"
          />
          <p className="text-white text-xl">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Alert className="bg-red-500/20 border-red-500/30 text-red-400">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription>Access Denied: You must be an administrator to view this page.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 pt-4 sm:pt-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Admin Control Center
            </h1>
            <p className="text-slate-300 text-sm sm:text-lg">Manage the entire VINmint ecosystem</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleUpdateMapCoordinates}
              disabled={isUpdatingCoordinates}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
              size="sm"
            >
              {isUpdatingCoordinates ? (
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              )}
              Geocode All
            </Button>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Platform Live
            </Badge>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        </div>

        {/* Enhanced Stats Grid - More Mobile Friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Total Revenue - Real Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
          >
            <Card className="bg-slate-800/80 border-green-400/40 backdrop-blur-xl shadow-lg">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-green-200 text-xs sm:text-sm font-medium">Total Revenue</p>
                    <p className="text-lg sm:text-2xl font-bold text-white truncate">${analytics.totalRevenue.toFixed(2)}</p>
                    <p className="text-green-300 text-xs">{stats.paidInvoices} paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-slate-800/80 border-blue-400/40 backdrop-blur-xl shadow-lg">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-200 text-xs sm:text-sm font-medium">Total Customers</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalCustomers}</p>
                    <p className="text-blue-300 text-xs">+{analytics.monthlyGrowth} new</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* VIN Vault Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-slate-800/80 border-purple-400/40 backdrop-blur-xl shadow-lg">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-lg flex items-center justify-center">
                    <KeyRound className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-purple-200 text-xs sm:text-sm font-medium">VIN Vault Balance</p>
                    <p className="text-lg sm:text-xl font-bold text-white truncate">{analytics.vinVaultBalance.toLocaleString()} VIN</p>
                    <p className="text-purple-300 text-xs">${(analytics.vinVaultBalance * 0.10).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Vehicles Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-slate-800/80 border-purple-500/40 backdrop-blur-xl shadow-lg">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Car className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-300 text-xs sm:text-sm font-medium">Registered VINs</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalVehicles}</p>
                    <p className="text-slate-400 text-xs">Active vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* NFTs Minted Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Card className="bg-slate-800/80 border-amber-400/40 backdrop-blur-xl shadow-lg">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-amber-200 text-xs sm:text-sm font-medium">Service NFTs</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{stats.nftsMinted}</p>
                    <p className="text-amber-300 text-xs">+{analytics.nftTrends.thisMonth} month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Admin Tabs */}
        <Tabs defaultValue="analytics" className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="bg-slate-800/50 border border-purple-500/20 p-1 w-max min-w-full">
              <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm px-2 sm:px-3">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="vault" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm px-2 sm:px-3">
                Vault & Rewards
              </TabsTrigger>
              <TabsTrigger value="shops" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm px-2 sm:px-3">
                Shops ({stats.totalShops})
              </TabsTrigger>
              <TabsTrigger value="dealers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm px-2 sm:px-3">
                Dealers ({stats.totalDealers})
              </TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 text-xs sm:text-sm px-2 sm:px-3">
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Customer Breakdown */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <PieChart className="w-6 h-6 text-blue-400" />
                    Customer Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-300">{analytics.customersByType.vehicle_owners || 0}</div>
                      <div className="text-sm text-slate-300 font-medium">Vehicle Owners</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-green-500/20">
                      <div className="text-2xl font-bold text-green-300">{analytics.customersByType.dealers || 0}</div>
                      <div className="text-sm text-slate-300 font-medium">Dealers</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-300">{analytics.customersByType.shop_owners || 0}</div>
                      <div className="text-sm text-slate-300 font-medium">Shop Owners</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-red-500/20">
                      <div className="text-2xl font-bold text-red-300">{analytics.customersByType.admins || 0}</div>
                      <div className="text-sm text-slate-300 font-medium">Admins</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registration Trends */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Activity className="w-6 h-6 text-green-400" />
                    Daily VIN Registrations (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentRegistrations.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                        <span className="text-slate-300 text-sm font-medium">{day.date}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-600/50 rounded-full h-2 min-w-24">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${day.count === 0 ? 0 : Math.max((day.count / Math.max(...analytics.recentRegistrations.map(d => d.count), 1)) * 100, 5)}%`
                              }}
                            />
                          </div>
                          <span className="text-white font-bold text-sm min-w-8 text-right">{day.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* NFT Analytics */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-400" />
                    NFT Minting Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-300">{analytics.nftTrends.totalMinted}</div>
                      <div className="text-sm text-slate-300 font-medium">Total Minted</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-300">{analytics.nftTrends.pendingMint}</div>
                      <div className="text-sm text-slate-300 font-medium">Pending Mint</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-300">{analytics.nftTrends.thisMonth}</div>
                      <div className="text-sm text-slate-300 font-medium">This Month</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real Revenue Breakdown */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    Revenue Breakdown (Real Data)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-200 font-medium">Business Registrations</span>
                      <span className="text-purple-300 font-bold text-lg">${analytics.revenueBreakdown.business_registration?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Dealer & shop registration fees ($150 each)
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-white/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-200 font-medium">VIN Registrations</span>
                      <span className="text-white font-bold text-lg">${analytics.revenueBreakdown.vin_registration?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      From actual paid invoices
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-green-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-200 font-medium">Service NFTs</span>
                      <span className="text-green-300 font-bold text-lg">${analytics.revenueBreakdown.service_nft?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      NFT minting fees collected
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-200 font-medium">Transfer Fees</span>
                      <span className="text-blue-300 font-bold text-lg">${analytics.revenueBreakdown.transfer_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Vehicle ownership transfers
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-400" />
                    Top Customers by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topCustomers.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No customer data available yet</p>
                    ) : (
                      analytics.topCustomers.map((customer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-purple-500/20">
                          <div>
                            <p className="text-white font-semibold">{customer.customer_email}</p>
                            <p className="text-slate-300 text-sm">{customer.invoice_count} transactions</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-300 font-bold text-lg">${customer.total_spent.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Real Invoice Activity */}
              <Card className="bg-slate-800/70 border-purple-500/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-400" />
                    Recent Invoice Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {invoices.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No invoices found.</p>
                    ) : (
                      invoices.slice(0, 10).map((invoice, index) => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-blue-500/20">
                          <div>
                            <p className="text-white font-semibold text-sm">{invoice.invoice_number}</p>
                            <p className="text-slate-300 text-xs">{invoice.description}</p>
                            <p className="text-slate-400 text-xs">{invoice.customer_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-300 font-bold text-lg">${invoice.amount_usd.toFixed(2)}</p>
                            <Badge className={
                              invoice.payment_status === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              invoice.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            } variant="outline">
                              {invoice.payment_status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vault">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white text-xl flex items-center gap-2">
                      <Wallet className="text-purple-400" />
                      VIN Vault Management
                    </CardTitle>
                    <p className="text-slate-400">Manage the system wallet used for NFT minting and token distribution.</p>
                  </div>
                   <Button onClick={loadVaultData} variant="outline" className="text-purple-300 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-white" disabled={isLoadingVault}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingVault ? 'animate-spin' : ''}`} />
                      Refresh
                   </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingVault ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : !vaultConfig ? (
                  <div className="text-center py-10">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">VIN Vault Not Found</h3>
                    <p className="text-slate-400 mb-6">
                      A dedicated wallet is required to manage token distributions for rewards and referrals.
                    </p>
                    <Button
                      onClick={handleGenerateVault}
                      disabled={isGeneratingVault}
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-3"
                    >
                      {isGeneratingVault ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <KeyRound className="w-5 h-5 mr-2" />
                      )}
                      {isGeneratingVault ? 'Generate Wallet...' : 'Generate New Vault Wallet'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                      <div className="p-4 bg-slate-700/50 rounded-lg">
                        <h3 className="text-white font-semibold mb-3">Vault Information</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-slate-400">Public Address</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-white font-mono text-xs break-all">{vaultConfig.public_key}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigator.clipboard.writeText(vaultConfig.public_key)}
                                className="text-purple-400 hover:text-white p-1"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <a href={`https://solscan.io/account/${vaultConfig.public_key}`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-white p-1">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </a>
                            </div>
                          </div>
                          <div>
                            <Label className="text-slate-400">Current Balances</Label>
                            <div className="mt-1 flex flex-col gap-1">
                              <div className="text-white flex items-center gap-2">
                                <SolanaLogoSmall />
                                <span className="font-bold">{vaultBalances.sol.toFixed(6)} SOL</span>
                                {vaultBalances.sol < 0.002 && (
                                  <span className="text-red-400 text-xs ml-2">⚠️ Low Balance</span>
                                )}
                              </div>
                              <div className="text-purple-300 flex items-center gap-2">
                                <VinTokenLogoSmall />
                                <span className="font-bold">{vaultBalances.vin.toLocaleString()} VIN</span>
                                {vaultBalances.vin === 0 && (
                                  <span className="text-amber-400 text-xs ml-2">⚠️ No VIN</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Secret Key - Preserve existing logic */}
                        <div className="mt-4 pt-4 border-t border-slate-600/50">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-orange-300 text-xs">Secret Key (Backup)</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowSecretKey(!showSecretKey)}
                              className="h-6 px-2 text-slate-400 hover:text-white"
                            >
                              {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </div>
                          {showSecretKey ? (
                            <div className="bg-slate-800/50 rounded p-2 mb-2">
                              <p className="text-yellow-300 font-mono text-xs break-all">
                                {vaultConfig.secret_key ? JSON.stringify(vaultConfig.secret_key) : 'Secret key not available'}
                              </p>
                              <Button
                                size="sm"
                                onClick={copySecretKey}
                                className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy Secret Key
                              </Button>
                            </div>
                          ) : (
                            <p className="text-slate-500 text-xs">Click the eye icon to reveal secret key</p>
                          )}
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 mt-2">
                            <p className="text-amber-300 text-xs">
                              ⚠️ Keep this secret key safe! It's needed to access the vault from external wallets.
                            </p>
                          </div>
                        </div>
                      </div>

                    {/* Low SOL Balance Warning */}
                    {vaultBalances.sol < 0.002 && (
                      <Alert className="bg-red-500/10 border-red-500/20">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-300">
                          <strong>Vault needs funding!</strong> The vault has insufficient SOL to pay for blockchain transaction fees.
                          NFT minting and token distributions will fail until the vault is funded with at least 0.002 SOL.
                          <br />
                          <strong>Solution:</strong> Send SOL to the vault address above using the "Receive Funds" button, or transfer directly from an external wallet.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Button onClick={() => setShowDistributionModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-16 text-base">
                          <DollarSign className="w-5 h-5 mr-2" />
                          Distribute Tokens
                       </Button>
                       <Button onClick={() => setShowVaultReceiveModal(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-16 text-base">
                          <QrCode className="w-5 h-5 mr-2" />
                          Receive Funds
                       </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Recent Rewards */}
              <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mt-6"> {/* Added mt-6 for spacing */}
                <CardHeader>
                  <CardTitle className="text-white text-xl">Recent Rewards</CardTitle>
                  <p className="text-slate-400">Recently distributed VIN token rewards</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {rewards.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">No rewards distributed yet</p>
                    ) : (
                      rewards.slice(0, 10).map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="text-white text-sm font-medium">{reward.reward_type?.replace(/_/g, ' ') || 'N/A'}</p>
                            <p className="text-slate-400 text-xs">{reward.reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">{reward.amount} VIN</p>
                            <p className="text-slate-500 text-xs">{format(new Date(reward.created_date), "MMM d")}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* Distribution Modal */}
          <Dialog open={showDistributionModal} onOpenChange={setShowDistributionModal}>
            <DialogContent className="bg-slate-800 border-purple-500 text-white max-w-[95vw] sm:max-w-md mx-4">
              <DialogHeader>
                <DialogTitle className="text-xl">Distribute Tokens from Vault</DialogTitle>
                <DialogDescription className="text-slate-400">Send SOL or $VIN to any Solana address.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Current Balances Display */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <Label className="text-purple-300 text-sm font-medium">Current Vault Balances</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-300">{vaultBalances.vin.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">$VIN Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-300">{vaultBalances.sol.toFixed(6)}</div>
                      <div className="text-xs text-slate-400">SOL Available</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tokenType" className="text-purple-300">Token</Label>
                  <Select
                    value={distributionForm.tokenType}
                    onValueChange={(value) => setDistributionForm(prev => ({...prev, tokenType: value}))}
                  >
                    <SelectTrigger id="tokenType" className="mt-2 bg-slate-700/50 border-purple-500/30 text-white">
                      <SelectValue placeholder="Select a token to distribute" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500 text-white">
                      <SelectItem value="VIN" className="flex items-center gap-2">
                         <div className="flex items-center gap-2"><VinTokenLogoSmall/><span>$VIN Token</span></div>
                      </SelectItem>
                      <SelectItem value="SOL">
                         <div className="flex items-center gap-2"><SolanaLogoSmall/><span>SOL</span></div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="recipient" className="text-purple-300">Recipient Address</Label>
                  <Input
                    id="recipient"
                    value={distributionForm.recipientAddress}
                    onChange={(e) => setDistributionForm(prev => ({...prev, recipientAddress: e.target.value}))}
                    className="mt-2 bg-slate-700/50 border-purple-500/30 text-white font-mono"
                    placeholder="Enter Solana wallet address"
                  />
                </div>
                <div>
                  <Label htmlFor="amount" className="text-purple-300">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    value={distributionForm.amount}
                    onChange={(e) => setDistributionForm(prev => ({...prev, amount: e.target.value}))}
                    className="mt-2 bg-slate-700/50 border-purple-500/30 text-white"
                    placeholder={`Amount of ${distributionForm.tokenType} to send`}
                  />
                  {distributionForm.amount && parseFloat(distributionForm.amount) > 0 && (
                    <div className="mt-1 text-xs">
                      {distributionForm.tokenType === 'VIN' && vaultBalances.vin < parseFloat(distributionForm.amount) && (
                        <span className="text-red-400">⚠️ Amount exceeds available VIN balance ({vaultBalances.vin.toLocaleString()})</span>
                      )}
                      {distributionForm.tokenType === 'SOL' && vaultBalances.sol < parseFloat(distributionForm.amount) && (
                        <span className="text-red-400">⚠️ Amount exceeds available SOL balance ({vaultBalances.sol.toFixed(6)})</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="reason" className="text-purple-300">Reason (Optional)</Label>
                  <Input
                    id="reason"
                    value={distributionForm.reason}
                    onChange={(e) => setDistributionForm(prev => ({...prev, reason: e.target.value}))}
                    className="mt-2 bg-slate-700/50 border-purple-500/30 text-white"
                    placeholder="e.g., Airdrop, reward, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDistributionModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
                <Button onClick={handleDistributeTokens} disabled={isLoadingVault} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  {isLoadingVault && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Distribution
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Vault Receive Modal */}
          {vaultConfig && (
            <ReceiveModal
                isOpen={showVaultReceiveModal}
                onClose={() => setShowVaultReceiveModal(false)}
                walletAddress={vaultConfig.public_key}
            />
          )}

          <TabsContent value="shops">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="text-white text-lg sm:text-xl">All Certified Shops</CardTitle>
                  <p className="text-slate-400 text-sm">Manage shop certifications and status</p>
                </div>
                <Button onClick={() => handleAddNew('Shop Owner')} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto" size="sm">
                  <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Add New Shop
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {shops.length === 0 ? (
                    <Alert className="bg-slate-700/30 border-slate-600/50 text-slate-300">
                      <AlertTriangle className="h-4 w-4 text-slate-300" />
                      <AlertDescription>No shop applications found.</AlertDescription>
                    </Alert>
                  ) : (
                    shops.map((shop, index) => (
                      <motion.div
                        key={shop.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <Card className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300">
                          <CardContent className="p-3 sm:p-6">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 sm:gap-4">
                                {shop.logo_url && (
                                  <img src={shop.logo_url} alt="Shop Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-white truncate">{shop.shop_name}</h3>
                                    <Badge className={getStatusColor(shop.status)} variant="outline">
                                      {shop.status}
                                    </Badge>
                                    {shop.latitude && shop.longitude ? (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30" variant="outline">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        On Map
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30" variant="outline">
                                        No Location
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="space-y-2 text-xs sm:text-sm">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <p className="text-slate-400">Cert ID: <span className="text-white font-mono break-all">{shop.certification_id}</span></p>
                                      <p className="text-slate-400">License: <span className="text-white break-all">{shop.business_license}</span></p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <p className="text-slate-400">Phone: <span className="text-white break-all">{shop.phone}</span></p>
                                      <p className="text-slate-400">Email: <span className="text-white break-all">{shop.email}</span></p>
                                    </div>
                                    <p className="text-slate-400">Address: <span className="text-white break-words">{shop.address}</span></p>
                                    <p className="text-slate-400">Wallet: <span className="text-purple-300 font-mono text-xs break-all">{shop.wallet_address}</span></p>
                                  </div>

                                  {shop.specialties && shop.specialties.length > 0 && (
                                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-3">
                                      {shop.specialties.map((specialty, i) => (
                                        <Badge key={i} variant="outline" className="border-slate-600 text-slate-300 text-xs">
                                          {specialty.replace(/_/g, ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-600/50">
                                {shop.status !== 'approved' && (
                                  <Button
                                    onClick={() => handleUpdateShopStatus(shop.id, 'approved')}
                                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                                    size="sm"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                {shop.status === 'approved' && (
                                  <Button
                                    onClick={() => handleUpdateShopStatus(shop.id, 'suspended')}
                                    className="bg-orange-600 hover:bg-orange-700 text-white border-0"
                                    size="sm"
                                  >
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    Suspend
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleUpdateShopStatus(shop.id, 'revoked')}
                                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                                  size="sm"
                                >
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  Revoke
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dealers">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="text-white text-lg sm:text-xl">All Certified Dealers</CardTitle>
                  <p className="text-slate-400 text-sm">Manage dealer certifications and status</p>
                </div>
                <Button onClick={() => handleAddNew('Dealer')} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto" size="sm">
                  <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Add New Dealer
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {dealers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-400 mb-2">No dealer applications found</h3>
                      <p className="text-slate-500">There are no dealers registered in the system.</p>
                    </div>
                  ) : (
                    dealers.map((dealer, index) => (
                      <motion.div
                        key={dealer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <Card className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300">
                          <CardContent className="p-3 sm:p-6">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 sm:gap-4">
                                {dealer.logo_url && (
                                  <img src={dealer.logo_url} alt="Dealer Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className="text-base sm:text-lg font-semibold text-white truncate">{dealer.full_name}</h4>
                                    <Badge className={getStatusColor(dealer.dealer_status)} variant="outline">
                                      {dealer.dealer_status}
                                    </Badge>
                                    {dealer.latitude && dealer.longitude ? (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30" variant="outline">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        On Map
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30" variant="outline">
                                        No Location
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="space-y-2 text-xs sm:text-sm">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <p className="text-slate-400">Email: <span className="text-white break-all">{dealer.email}</span></p>
                                      <p className="text-slate-400">Phone: <span className="text-white break-all">{dealer.phone || 'Not provided'}</span></p>
                                    </div>
                                    <p className="text-slate-400">Address: <span className="text-white break-words">{dealer.address || 'Not provided'}</span></p>
                                    <p className="text-slate-400">License: <span className="text-white font-mono break-all">{dealer.business_license || 'Not provided'}</span></p>
                                    <p className="text-slate-400">Wallet: <span className="text-purple-300 font-mono text-xs break-all">{dealer.wallet_address}</span></p>
                                    <p className="text-slate-400">Registered: <span className="text-white">{format(new Date(dealer.created_date), "MMM d, yyyy")}</span></p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-600/50">
                                {dealer.dealer_status !== 'approved' && (
                                  <Button
                                    onClick={() => handleUpdateDealerStatus(dealer.id, 'approved')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    size="sm"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Approve
                                  </Button>
                                )}
                                {dealer.dealer_status === 'approved' && (
                                  <Button
                                    onClick={() => handleUpdateDealerStatus(dealer.id, 'suspended')}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                    size="sm"
                                  >
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Suspend
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleUpdateDealerStatus(dealer.id, 'revoked')}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                  Revoke
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Recent Platform Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {serviceRecords.length === 0 ? (
                      <Alert className="bg-slate-700/30 border-slate-600/50 text-slate-300">
                        <AlertTriangle className="h-4 w-4 text-slate-300" />
                        <AlertDescription>No recent service records.</AlertDescription>
                      </Alert>
                    ) : (
                      serviceRecords.slice(0, 8).map((record) => (
                        <div key={record.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                          <Wrench className="w-4 h-4 text-purple-400" />
                          <div className="flex-1">
                            <p className="text-white text-sm">{record.shop_name}</p>
                            <p className="text-slate-400 text-xs">{record.service_type.replace(/_/g, ' ')} • {record.vin}</p>
                          </div>
                          <span className="text-slate-400 text-xs">
                            {format(new Date(record.created_date), "MMM d")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-300">
                      All systems operational. Solana blockchain connected.
                    </AlertDescription>
                  </Alert>

                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Shield className="h-4 h-4 text-blue-500" />
                    <AlertDescription className="text-blue-300">
                      {stats.approvedShops} certified shops actively issuing service NFTs.
                    </AlertDescription>
                  </Alert>

                  <Alert className="bg-purple-500/10 border-purple-500/20">
                    <TrendingUp className="h-4 h-4 text-purple-500" />
                    <AlertDescription className="text-purple-300">
                      {stats.thisMonthServices} new service records created this month.
                    </AlertDescription>
                  </Alert>

                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <MapPin className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-300">
                      {stats.shopsWithCoordinates} shops and {stats.dealersWithCoordinates} dealers visible on map.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Invite User Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
            <DialogContent className="bg-slate-800 border-purple-500 text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-purple-400" />
                    Add New {inviteType}
                </DialogTitle>
                <DialogDescription className="text-slate-400 pt-2">
                    Choose how you want to add a new {inviteType} to the platform. As an admin, no registration fees will be charged.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-6">
                {/* Method Selection */}
                <div className="space-y-3">
                  <Label className="text-purple-300 font-medium">Registration Method</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      variant={inviteMethod === 'link' ? 'default' : 'outline'}
                      onClick={() => { setInviteMethod('link'); setGeneratedLink(null); }}
                      className={inviteMethod === 'link'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      }
                    >
                      Share Invite Link
                    </Button>
                    <Button
                      variant={inviteMethod === 'instant' ? 'default' : 'outline'}
                      onClick={() => setInviteMethod('instant')}
                      className={inviteMethod === 'instant'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      }
                    >
                      Instant Registration
                    </Button>
                  </div>
                </div>

                {inviteMethod === 'link' ? (
                  // Share Link Method
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                      <h4 className="text-blue-200 font-semibold mb-2">Shareable Invite Link</h4>
                      <p className="text-blue-100 text-sm">
                        Generate a single-use link for a new user to register as a {inviteType} for free. The link expires in 7 days.
                      </p>
                    </div>

                    {!generatedLink && (
                      <Button
                        onClick={handleGenerateInvite}
                        disabled={isProcessingInvite}
                        className="w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white"
                      >
                        {isProcessingInvite ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          'Generate Invite Link'
                        )}
                      </Button>
                    )}

                    {generatedLink && (
                       <div className="space-y-3">
                         <Label className="text-green-300">Link Generated Successfully!</Label>
                         <div className="bg-slate-900 p-3 rounded-lg border border-slate-600">
                            <p className="text-white font-mono text-sm break-all">{generatedLink}</p>
                         </div>
                         <Button
                            onClick={() => navigator.clipboard.writeText(generatedLink)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                         >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                         </Button>
                       </div>
                    )}
                  </div>
                ) : (
                  // Instant Registration Method
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/20 border border-green-400/50 rounded-lg">
                      <h4 className="text-green-200 font-semibold mb-2">Instant Registration</h4>
                      <p className="text-green-100 text-sm">
                        Create the {inviteType} account immediately. A new native wallet will be automatically generated for the user.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-purple-300 font-medium">Email Address *</Label>
                        <Input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm(prev => ({...prev, email: e.target.value}))}
                          placeholder="user@example.com"
                          className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-purple-300 font-medium">Full Name *</Label>
                        <Input
                          value={inviteForm.full_name}
                          onChange={(e) => setInviteForm(prev => ({...prev, full_name: e.target.value}))}
                          placeholder="John Doe"
                          className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        />
                      </div>
                    </div>

                    {inviteType === 'Shop Owner' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-purple-300 font-medium">Business Name *</Label>
                          <Input
                            value={inviteForm.business_name}
                            onChange={(e) => setInviteForm(prev => ({...prev, business_name: e.target.value}))}
                            placeholder="Auto Shop Name"
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-300 font-medium">Business License *</Label>
                          <Input
                            value={inviteForm.business_license}
                            onChange={(e) => setInviteForm(prev => ({...prev, business_license: e.target.value}))}
                            placeholder="License Number"
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                          />
                        </div>
                      </div>
                    )}

                    {inviteType === 'Dealer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-purple-300 font-medium">Business Name</Label>
                          <Input
                              value={inviteForm.business_name}
                              onChange={(e) => setInviteForm(prev => ({...prev, business_name: e.target.value}))}
                              placeholder="Optional dealership name"
                              className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-300 font-medium">Business License</Label>
                          <Input
                            value={inviteForm.business_license}
                            onChange={(e) => setInviteForm(prev => ({...prev, business_license: e.target.value}))}
                            placeholder="Optional - will auto-generate if empty"
                            className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                          />
                        </div>
                      </div>
                    )}

                    {/* Removed the 'Solana Wallet Address' input field */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-purple-300 font-medium">Phone</Label>
                        <Input
                          value={inviteForm.phone}
                          onChange={(e) => setInviteForm(prev => ({...prev, phone: e.target.value}))}
                          placeholder="(555) 123-4567"
                          className="bg-slate-700/50 border-purple-500/30 text-white mt-2"
                        />
                      </div>
                      <div>
                        <AddressInput
                          label="Personal Address *"
                          value={inviteForm.address}
                          onChange={(value) => setInviteForm(prev => ({...prev, address: value}))}
                          placeholder="User's personal address"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    {inviteType === 'Shop Owner' && (
                      <AddressInput
                        label="Shop Business Address *"
                        value={inviteForm.shop_address}
                        onChange={(value) => setInviteForm(prev => ({...prev, shop_address: value}))}
                        placeholder="Shop's physical address"
                        className="mt-2"
                      />
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </Button>
                {inviteMethod === 'instant' && (
                    <Button
                      onClick={handleInstantRegistration}
                      disabled={isProcessingInvite}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      {isProcessingInvite ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Create ${inviteType} Account`
                      )}
                    </Button>
                )}
              </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
