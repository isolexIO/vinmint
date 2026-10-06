import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useWallet } from '@/lib/WalletContext';
import getWalletViewProfile from '@/components/wallet/getWalletViewProfile';
import WalletOnlyNotice from '@/components/wallet/WalletOnlyNotice';
import WalletSwitcher from '@/components/wallet/WalletSwitcher';
import useSelectedWalletData from '@/components/wallet/useSelectedWalletData';
import { generateAndSaveWallet } from '@/functions/generateAndSaveWallet.js';
import { getPrivateKey } from '@/functions/getPrivateKey.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Wallet as WalletIcon,
  Copy,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  Loader2,
  List,
  AlertTriangle,
  Car,
  Wrench,
  KeyRound,
  EyeOff,
  ExternalLink,
  Globe,
  Zap,
  QrCode,
  DollarSign,
  ShoppingCart,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import TransferModal from '../components/wallet/TransferModal';
import ReceiveModal from '../components/wallet/ReceiveModal';
import BuyVinModal from '../components/wallet/BuyVinModal';
import TransferBetweenWalletsModal from '../components/wallet/TransferBetweenWalletsModal';
import { format } from 'date-fns';

const SolanaLogo = () => (
    <svg width="24" height="24" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
      <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#solana-gradient)" />
      <defs><linearGradient id="solana-gradient" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
    </svg>
);

const VinTokenLogo = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-8 h-8 rounded-full" />
);

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function WalletPage() {
    const { walletAddress, walletType, autoKeypair, disconnect } = useWallet();
    const [hasAccount, setHasAccount] = useState(false);
    const [accountWallet, setAccountWallet] = useState(null);
    const [user, setUser] = useState(null);

    const [prices, setPrices] = useState({ sol: 0, vin: 0.10 });
    const [isPricesLoading, setIsPricesLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showBuyVinModal, setShowBuyVinModal] = useState(false);
    const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
    const [privateKey, setPrivateKey] = useState(null);
    const [isFetchingKey, setIsFetchingKey] = useState(false);
    const [hasErrors, setHasErrors] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState('vinmint');
    const [showTransferBetweenModal, setShowTransferBetweenModal] = useState(false);
    const generatedAddress = autoKeypair?.publicKey.toString() || null;
    const vinmintWallet = accountWallet || generatedAddress;
    const connectedWallet = walletType !== 'auto' ? walletAddress : null;
    const hasTwoWallets = Boolean(vinmintWallet && connectedWallet && vinmintWallet !== connectedWallet);
    const activeWallet = selectedWallet === 'connected' && hasTwoWallets
        ? 'connected' : vinmintWallet ? 'vinmint' : 'connected';
    const activeAddress = activeWallet === 'connected' ? connectedWallet : vinmintWallet;
    const { balances: displayBalances, transactions, vinNfts, serviceNfts,
        isBalanceLoading: displayBalanceLoading, isTransactionsLoading, isNftsLoading,
        hasErrors: hasAssetErrors, refreshTransactions, refreshWalletData
    } = useSelectedWalletData(isLoading ? null : activeAddress, hasAccount);
    const canUseAccountWallet = Boolean(hasAccount && accountWallet && activeAddress === accountWallet);
    const canRevealKey = Boolean(activeAddress && (canUseAccountWallet || generatedAddress === activeAddress));
    const displayUsdValue = (displayBalances.sol * prices.sol) + (displayBalances.vin * prices.vin);

    const fetchPrices = useCallback(async () => {
        setIsPricesLoading(true);
        try {
            const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
            const data = await response.json();
            
            setPrices({
                sol: data.solana?.usd || 0,
                vin: 0.10 // Fixed price for VIN token at $0.10
            });
        } catch (error) {
            console.error("Error fetching prices:", error);
            setPrices({ sol: 0, vin: 0.10 });
        } finally {
            setIsPricesLoading(false);
        }
    }, []);

    const loadWalletData = useCallback(async () => {
        setIsLoading(true);
        setHasErrors(false);
        try {
            const authenticated = await base44.auth.isAuthenticated();
            const account = authenticated ? await base44.auth.me() : null;
            setHasAccount(Boolean(account));
            setAccountWallet(account?.wallet_address || null);
            const address = account?.wallet_address || generatedAddress || walletAddress;
            setUser(account ? { ...account, wallet_address: address } : getWalletViewProfile(address));
            await fetchPrices();
        } catch (error) {
            console.error('Error loading wallet data:', error);
            setHasAccount(false);
            setAccountWallet(null);
            setUser(getWalletViewProfile(generatedAddress || walletAddress));
            setHasErrors(true);
        } finally {
            setIsLoading(false);
        }
    }, [fetchPrices, generatedAddress, walletAddress]);

    useEffect(() => { loadWalletData(); }, [loadWalletData]);

    useEffect(() => {
        if (isLoading || !canUseAccountWallet || displayBalanceLoading || hasAssetErrors) return;
        base44.auth.updateMe({ solana_balance: displayBalances.sol, vin_token_balance: displayBalances.vin })
            .catch(error => console.warn('Failed to update user balances:', error));
    }, [isLoading, canUseAccountWallet, displayBalanceLoading, hasAssetErrors, displayBalances.sol, displayBalances.vin]);

    const selectWallet = (selection) => {
        setShowTransferModal(false);
        setShowReceiveModal(false);
        setShowBuyVinModal(false);
        setShowPrivateKeyModal(false);
        setPrivateKey(null);
        setSelectedWallet(selection);
    };

    const handleWalletActionSuccess = async () => {
        await refreshWalletData();
    };

    const handleCreateWallet = async () => {
        setIsGenerating(true);
        try {
            await generateAndSaveWallet();
            await delay(2000); // Wait a bit before reloading
            setSelectedWallet('vinmint');
            await loadWalletData();
            await refreshWalletData();
        } catch (error) {
            console.error("Error creating wallet:", error);
            alert("Failed to create wallet. Please try again in a moment.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleShowPrivateKey = async () => {
        setShowPrivateKeyModal(true);
        setIsFetchingKey(true);
        setPrivateKey(null);
        
        try {
            if (generatedAddress === activeAddress) {
                setPrivateKey(Array.from(autoKeypair.secretKey));
                return;
            }
            const response = await getPrivateKey();
            if (response.data.success) {
                setPrivateKey(response.data.private_key);
            } else {
                throw new Error(response.data.error || "Failed to fetch key.");
            }
        } catch (error) {
            console.error("Error fetching private key:", error);
            setPrivateKey("Error fetching private key. Please try again.");
        } finally {
            setIsFetchingKey(false);
        }
    };
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    const openSolscan = () => {
        if (activeAddress) {
            window.open(`https://solscan.io/account/${activeAddress}`, '_blank');
        }
    };

    const openReceiveModal = () => {
        setShowReceiveModal(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
                    <p className="text-white text-xl mb-2">Loading VINmint Wallet...</p>
                    <p className="text-slate-400 text-sm">This may take a moment due to network traffic</p>
                </div>
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                 <Card className="bg-slate-800/50 border-red-500/20 backdrop-blur-xl max-w-md w-full">
                     <CardHeader>
                         <CardTitle className="text-2xl text-red-400 flex items-center gap-3">
                             <AlertTriangle className="w-8 h-8" />
                             Wallet Unavailable
                         </CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p className="text-slate-300">Reconnect your Solana wallet to view its public balances and history.</p>
                         <Button 
                             onClick={() => { window.location.href = '/WalletLogin?next=%2FWallet'; }}
                             className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                         >
                             Connect Wallet
                             </Button>
                     </CardContent>
                 </Card>
            </div>
         );
    }

    if (!activeAddress) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl max-w-md w-full text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl text-white">Create Your VINmint Wallet</CardTitle>
                        <p className="text-slate-400 pt-2">A unique Solana wallet is required to manage your digital assets.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-300">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <AlertDescription>
                            We will generate a new wallet for you. This may take a few moments.
                          </AlertDescription>
                        </Alert>
                        <Button onClick={handleCreateWallet} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-6 text-lg">
                            {isGenerating ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <WalletIcon className="w-6 h-6 mr-2" />}
                            {isGenerating ? 'Creating Your Wallet...' : 'Create My Wallet'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }



    return (
        <>
            <TransferModal 
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                onTransferSuccess={handleWalletActionSuccess}
            />
            
            <ReceiveModal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                walletAddress={activeAddress}
            />

            <BuyVinModal
                isOpen={showBuyVinModal}
                onClose={() => setShowBuyVinModal(false)}
                walletAddress={vinmintWallet}
                onPurchaseSuccess={handleWalletActionSuccess}
            />

            <TransferBetweenWalletsModal
                isOpen={showTransferBetweenModal}
                onClose={() => setShowTransferBetweenModal(false)}
                vinmintWallet={vinmintWallet}
                connectedWallet={connectedWallet}
                vinmintKeypair={generatedAddress === vinmintWallet ? autoKeypair : null}
                canWithdrawFromAccount={Boolean(hasAccount && accountWallet === vinmintWallet)}
                onSuccess={handleWalletActionSuccess}
            />
            
            <Dialog open={showPrivateKeyModal} onOpenChange={setShowPrivateKeyModal}>
                <DialogContent className="bg-slate-900 border-red-500 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6" /> Private Key
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 pt-2">
                            Your private key grants full access to your wallet. Never share it with anyone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-slate-800 rounded-lg my-4">
                        {isFetchingKey ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                <p className="ml-2 text-slate-300">Fetching private key...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-red-300 text-sm break-all font-mono p-2 bg-slate-900 rounded-md">
                                    {privateKey ? JSON.stringify(privateKey) : "Could not retrieve key."}
                                </p>
                                {privateKey && Array.isArray(privateKey) && (
                                  <Button onClick={() => copyToClipboard(JSON.stringify(privateKey))} className="w-full bg-red-600 hover:bg-red-700">
                                      <Copy className="w-4 h-4 mr-2" /> Copy Private Key
                                  </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 pt-8">
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">My Wallet</h1>
                        <p className="text-slate-300 text-lg">Manage your digital assets on the VINmint network.</p>
                        {!hasAccount && <WalletOnlyNotice />}
                        {(hasErrors || hasAssetErrors) && (
                            <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-300 mt-4">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <AlertDescription>
                                    Some data may be unavailable due to high network traffic. Try refreshing in a moment.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <WalletSwitcher
                        activeWallet={activeWallet} onSelect={selectWallet}
                        vinmintWallet={vinmintWallet} connectedWallet={connectedWallet}
                        hasAccount={hasAccount} onCreate={handleCreateWallet} isGenerating={isGenerating}
                        onSignIn={() => base44.auth.redirectToLogin(window.location.href)}
                    />

                    {/* Wallet Address Card */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-8">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <Label className="text-purple-300">
                                            {activeWallet === 'connected' ? 'Connected Wallet Address' : 'Your VINmint Wallet Address'}
                                        </Label>
                                        <div className="flex items-center gap-3 mt-2">
                                            <WalletIcon className="w-6 h-6 text-purple-400 flex-shrink-0" />
                                            <p className="text-white font-mono text-xs sm:text-sm md:text-base break-all">{activeAddress}</p>
                                        </div>
                                        
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                <Zap className="w-3 h-3 mr-1" />
                                                Solana Mainnet
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <Button onClick={() => copyToClipboard(activeAddress)} variant="ghost" className="flex-1 text-slate-300 hover:bg-purple-500/20 hover:text-white">
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                        </Button>
                                        <Button onClick={openSolscan} variant="ghost" className="flex-1 text-slate-300 hover:bg-blue-500/20 hover:text-white">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Solscan
                                        </Button>
                                        {activeWallet === 'vinmint' && (
                                            <Button onClick={handleShowPrivateKey} disabled={!canRevealKey} variant="destructive" className="flex-1 bg-red-900/50 text-red-300 hover:bg-red-900">
                                                <KeyRound className="w-4 h-4 mr-2" />
                                                Key
                                            </Button>
                                        )}
                                        {connectedWallet && (
                                            <Button onClick={() => disconnect()} variant="outline" className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Disconnect
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tabs for Tokens and NFTs */}
                    <Tabs defaultValue="tokens" className="space-y-6">
                      <TabsList className="bg-slate-800/50 border border-purple-500/20 p-1">
                        <TabsTrigger value="tokens" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                          Tokens & Actions
                        </TabsTrigger>
                        <TabsTrigger value="vin_nfts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                          VIN NFTs ({hasAccount ? (isNftsLoading ? '…' : vinNfts.length) : '—'})
                        </TabsTrigger>
                        <TabsTrigger value="service_nfts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                          Service NFTs ({hasAccount ? (isNftsLoading ? '…' : serviceNfts.length) : '—'})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="tokens">
                        {/* Portfolio Value Card */}
                        <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-6">
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <h3 className="text-slate-400 text-sm mb-2">
                                        {activeWallet === 'connected' ? 'Connected Wallet Value' : 'VINmint Wallet Value'}
                                    </h3>
                                    {isPricesLoading || displayBalanceLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                            <span className="text-slate-300">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className="text-4xl font-bold text-white mb-1">
                                            ${displayUsdValue.toFixed(2)}
                                        </p>
                                    )}
                                    <p className="text-slate-400 text-xs">Live mainnet prices</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Balance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                                 <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl h-full">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
                                            <SolanaLogo />
                                            SOL
                                        </CardTitle>
                                        <DollarSign className="w-5 h-5 text-green-400" />
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {displayBalanceLoading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                                <span className="text-slate-300 text-sm">Loading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-2xl sm:text-3xl font-bold text-white">
                                                    {displayBalances.sol.toFixed(9)}
                                                </p>
                                                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                                                    {isPricesLoading ? "Loading price..." : `$${(displayBalances.sol * prices.sol).toFixed(2)} USD`}
                                                </p>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl h-full">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
                                            <VinTokenLogo />
                                            $VIN
                                        </CardTitle>
                                        <DollarSign className="w-5 h-5 text-green-400" />
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {displayBalanceLoading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                                                <span className="text-slate-300 text-sm">Loading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-2xl sm:text-3xl font-bold text-white">
                                                    {displayBalances.vin.toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 6
                                                    })}
                                                </p>
                                                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                                                    ${(displayBalances.vin * prices.vin).toFixed(2)} USD
                                                </p>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl mb-8">
                                 <CardHeader>
                                    <CardTitle className="text-white">Wallet Actions</CardTitle>
                                    <p className="text-slate-400 text-sm">Available operations for your wallet</p>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                   <Button onClick={() => setShowTransferModal(true)} disabled={!canUseAccountWallet} title={!canUseAccountWallet ? 'Select your VINmint account wallet to send tokens here. External wallets send through their own wallet app.' : undefined} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white h-20 flex-col text-sm gap-1">
                                        <ArrowUpCircle className="w-6 h-6" />
                                        Send Tokens
                                    </Button>
                                    <Button onClick={() => setShowBuyVinModal(true)} disabled={!canUseAccountWallet} title={!canUseAccountWallet ? 'Select your VINmint account wallet to buy VIN.' : undefined} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white h-20 flex-col text-sm gap-1 hover:from-amber-400 hover:to-orange-500">
                                        <ShoppingCart className="w-6 h-6" />
                                        Buy VIN
                                    </Button>
                                    <Button onClick={() => setShowTransferBetweenModal(true)} disabled={!hasTwoWallets} title={!hasTwoWallets ? 'Connect an external wallet different from your VINmint wallet to transfer between them.' : undefined} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white h-20 flex-col gap-1 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60">
                                        <Repeat className="w-6 h-6" />
                                        <span className="text-xs leading-tight text-center">Transfer<br/>Between Wallets</span>
                                    </Button>
                                    <Button onClick={openReceiveModal} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white h-20 flex-col text-sm gap-1">
                                        <QrCode className="w-6 h-6" />
                                        Receive
                                    </Button>
                                    <Button onClick={openSolscan} variant="outline" className="border-blue-600 text-blue-300 h-20 flex-col text-sm gap-1 hover:bg-blue-600/20 hover:text-white">
                                        <ExternalLink className="w-6 h-6" />
                                        View on Solscan
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                        
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center justify-between">
                                        Recent Transactions
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={refreshTransactions}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <Repeat className="w-4 h-4" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isTransactionsLoading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" aria-label="Loading selected wallet history" /></div>
                                    ) : transactions.length > 0 ? (
                                        <div className="space-y-3">
                                            {transactions.map(tx => (
                                                <div key={tx.id || tx.transaction_hash} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {(tx.balanceChange !== undefined && tx.balanceChange < 0) || (tx.sender_wallet === activeAddress) ? (
                                                            <ArrowUpCircle className="w-6 h-6 text-red-400" />
                                                        ) : (
                                                            <ArrowDownCircle className="w-6 h-6 text-green-400" />
                                                        )}
                                                        <div>
                                                            <p className="text-white font-medium">
                                                                {(tx.balanceChange !== undefined && tx.balanceChange < 0) || (tx.sender_wallet === activeAddress) ? 'Sent' : 'Received'} {tx.token_type}
                                                                {tx.isOnChain && <Badge className="ml-2 bg-green-500/20 text-green-300 text-xs">On-Chain</Badge>}
                                                            </p>
                                                            <p className="text-slate-400 text-xs font-mono">
                                                               {tx.transaction_hash?.substring(0,12)}...
                                                                {tx.isOnChain && (
                                                                    <a 
                                                                        href={`https://solscan.io/tx/${tx.transaction_hash}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="ml-2 text-purple-400 hover:underline"
                                                                    >
                                                                        View
                                                                    </a>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold ${(tx.balanceChange !== undefined && tx.balanceChange < 0) || (tx.sender_wallet === activeAddress) ? 'text-red-400' : 'text-green-400'}`}>
                                                            {(tx.balanceChange !== undefined && tx.balanceChange < 0) || (tx.sender_wallet === activeAddress) ? '-' : '+'} {tx.amount} {tx.token_type}
                                                        </p>
                                                        <p className="text-slate-500 text-xs">{format(new Date(tx.created_date), "MMM d, yyyy")}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-slate-400 mb-2">No transactions found.</p>
                                            <p className="text-slate-500 text-sm">Make a transaction to see it here.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="vin_nfts">
                        <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                          <CardHeader><CardTitle className="text-white">My VIN NFTs</CardTitle></CardHeader>
                          <CardContent>
                            {isNftsLoading ? (
                              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" aria-label="Loading selected wallet NFTs" /></div>
                            ) : vinNfts.length > 0 ? (
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vinNfts.map(nft => (
                                  <Card key={nft.id} className="bg-slate-700/30 border-purple-500/20">
                                    <CardHeader>
                                      <CardTitle className="text-base text-white flex items-center gap-2">
                                        <Car className="w-5 h-5 text-purple-400"/> {nft.year} {nft.make} {nft.model}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="font-mono text-xs text-purple-300">{nft.domain}</p>
                                      <p className="font-mono text-xs text-slate-400 mt-1">VIN: {nft.vin}</p>
                                      <p className="font-mono text-xs text-slate-400">Token ID: {nft.nft_token_id ? nft.nft_token_id.substring(0, 8) + '...' : 'Pending'}</p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-center py-8">{hasAccount ? 'You do not own any VIN NFTs yet. Register a vehicle to get started!' : 'Private VINmint NFT records are not loaded in a wallet-only session.'}</p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="service_nfts">
                        <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                          <CardHeader><CardTitle className="text-white">My Service Record NFTs</CardTitle></CardHeader>
                          <CardContent>
                            {isNftsLoading ? (
                              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" aria-label="Loading selected wallet service NFTs" /></div>
                            ) : serviceNfts.length > 0 ? (
                               <div className="space-y-3">
                                {serviceNfts.map(nft => (
                                  <div key={nft.id} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                                    <div className="flex justify-between items-center">
                                      <p className="font-semibold text-white flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-green-400"/>
                                        {nft.service_type.replace(/_/g, ' ')}
                                      </p>
                                      <p className="text-sm text-slate-400">{format(new Date(nft.created_date), 'MMM d, yyyy')}</p>
                                    </div>
                                    <p className="text-sm text-slate-300 mt-1">For VIN: {nft.vin}</p>
                                    <p className="text-xs text-slate-400">Serviced by: {nft.shop_name}</p>
                                    <p className="text-xs font-mono text-purple-300 mt-2 break-all">Token ID: {nft.nft_token_id || 'Pending'}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-center py-8">{hasAccount ? 'You have not received any Service NFTs yet.' : 'Private service NFT records are not loaded in a wallet-only session.'}</p>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
}