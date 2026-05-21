import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Vehicle } from "@/entities/Vehicle";
import { CertifiedShop } from "@/entities/CertifiedShop";
import { ServiceRecord } from "@/entities/ServiceRecord";
import { Notification } from "@/entities/Notification"; // Import Notification entity
import { getWalletBalance } from "@/functions/getWalletBalance"; // Import balance function
import {
  Car,
  Search,
  Settings,
  Home,
  PlusCircle,
  Store,
  Shield,
  Wallet,
  Menu,
  X,
  User as UserIcon,
  LogIn,
  Building,
  Copy,
  LogOut,
  Map,
  Loader2, // Added Loader2 icon
  RefreshCw // Added RefreshCw icon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import NotificationSystem from './components/NotificationSystem'; // Import NotificationSystem

// Token logos components
const SolanaLogoSmall = () => (
    <svg width="16" height="16" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
      <path fillRule="evenodd" clipRule="evenodd" d="M38.25 106.942C34.338 106.942 31.022 103.626 31.022 99.714V28.286C31.022 24.374 34.338 21.058 38.25 21.058H50.584C54.496 21.058 57.812 24.374 57.812 28.286V99.714C57.812 103.626 54.496 106.942 50.584 106.942H38.25ZM96.978 21.058C100.89 21.058 104.206 24.374 104.206 28.286V99.714C104.206 103.626 100.89 106.942 96.978 106.942H84.644C80.732 106.942 77.416 103.626 77.416 99.714V28.286C77.416 24.374 80.732 21.058 84.644 21.058H96.978ZM71.022 99.714V28.286C71.022 24.374 74.338 21.058 78.25 21.058H65.916C62.004 21.058 58.688 24.374 58.688 28.286V99.714C58.688 103.626 62.004 106.942 65.916 106.942H78.25C74.338 106.942 71.022 103.626 71.022 99.714Z" fill="url(#solana-gradient-small)" />
      <defs><linearGradient id="solana-gradient-small" x1="31.022" y1="64" x2="104.206" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
    </svg>
);

const VinTokenLogoSmall = () => (
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-4 h-4 rounded-full" />
);

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState({
    vehicles: 0,
    shops: 0,
    serviceRecords: 0
  });
  const [liveBalances, setLiveBalances] = useState({ sol: 0, vin: 0 }); // New state for live balances
  const [isBalanceLoading, setIsBalanceLoading] = useState(false); // New state for balance loading
  const [notifications, setNotifications] = useState([]);

  const isHomePage = location.pathname === createPageUrl("Home") || currentPageName === "Home";

  const fetchLiveBalances = useCallback(async (walletAddress) => {
    setIsBalanceLoading(true);
    try {
      const response = await getWalletBalance({ walletAddress });
      if (response.data && response.data.success) {
        const solBalance = response.data.solBalance || 0;
        const vinTokenBalance = response.data.vinTokenBalance || 0;

        setLiveBalances({
          sol: solBalance,
          vin: vinTokenBalance
        });
        
        // Update user data with live balances
        await base44.auth.updateMe({
          solana_balance: solBalance,
          vin_token_balance: vinTokenBalance
        });
      }
    } catch (error) {
      console.error("Error fetching live balances:", error);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // If user has a wallet, fetch live balances
      if (userData?.wallet_address) {
        fetchLiveBalances(userData.wallet_address);
      }
    } catch (error) {
      console.log("User not authenticated");
      setUser(null); // Ensure user is null if not authenticated
    } finally {
      setIsLoading(false);
    }
  }, [fetchLiveBalances]);

  const loadLiveStats = useCallback(async () => {
    try {
      const [vehicles, shops, serviceRecords] = await Promise.all([
        Vehicle.list(),
        CertifiedShop.filter({ status: 'approved' }), // Changed from list() to filter()
        ServiceRecord.list()
      ]);
      
      setLiveStats({
        vehicles: vehicles.length,
        shops: shops.length, // Already filtered by CertifiedShop.filter
        serviceRecords: serviceRecords.length
      });
    } catch (error) {
      console.error("Error loading live stats:", error);
      setLiveStats({
        vehicles: 0,
        shops: 0,
        serviceRecords: 0
      });
    }
  }, []);
  
  const fetchNotifications = useCallback(async (userId) => {
      try {
          const userNotifications = await Notification.filter({ user_id: userId, is_read: false }, "-created_date", 10);
          setNotifications(userNotifications);
      } catch(error) {
          console.error("Failed to fetch notifications:", error);
      }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
      if (user?.id) {
          fetchNotifications(user.id);
          const intervalId = setInterval(() => fetchNotifications(user.id), 60000); // Poll every 60 seconds
          return () => clearInterval(intervalId);
      }
  }, [user, fetchNotifications]);

  useEffect(() => {
    // Redirect logic remains unchanged
    if (user && !user.profile_completed && user.user_type !== 'admin' && !isHomePage && location.pathname !== createPageUrl("ProfileSetup")) {
      window.location.href = createPageUrl("ProfileSetup");
    }
  }, [user, location, isHomePage]);

  const refreshBalances = () => {
    if (user?.wallet_address) {
      fetchLiveBalances(user.wallet_address);
    }
  };
  
  const handleClearNotification = (clearedId) => {
      setNotifications(prev => prev.filter(n => n.id !== clearedId));
  };
  
  const handleClearAllNotifications = () => {
      setNotifications([]);
  };
  
  // Different navigation items based on user type
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Home",
        url: createPageUrl("Home"),
        icon: Home,
      },
      {
        title: "Explorer", 
        url: createPageUrl("Explorer"),
        icon: Search,
      },
      {
        title: "Network Map",
        url: createPageUrl("Map"),
        icon: Map
      }
    ];

    if (!user) {
      return baseItems;
    }
    
    // Admin users get full access regardless of profile completion
    if (user.user_type === "admin") {
      return [
        ...baseItems,
        {
          title: "My Wallet",
          url: createPageUrl("Wallet"),
          icon: Wallet
        },
        {
          title: "Register VIN",
          url: createPageUrl("RegisterVIN"),
          icon: PlusCircle,
        },
        {
          title: "Customer Dashboard",
          url: createPageUrl("CustomerDashboard"),
          icon: Car,
        },
        {
          title: "Dealer Dashboard",
          url: createPageUrl("DealerDashboard"),
          icon: Building,
        },
        {
          title: "Shop Dashboard",
          url: createPageUrl("ShopDashboard"),
          icon: Store,
        },
        {
          title: "Admin Panel",
          url: createPageUrl("AdminPanel"),
          icon: Shield,
        },
        {
          title: "My Profile",
          url: createPageUrl("UserProfile"),
          icon: UserIcon,
        }
      ];
    }
    
    // All authenticated users should see wallet option
    const walletItem = {
      title: "My Wallet",
      url: createPageUrl("Wallet"),
      icon: Wallet
    };

    // Non-admin users who haven't completed their profile only see base items + wallet
    if (!user.profile_completed) {
      return [...baseItems, walletItem];
    }

    if (user.user_type === "vehicle_owner") {
      return [
        ...baseItems,
        walletItem,
        {
          title: "Register VIN",
          url: createPageUrl("RegisterVIN"),
          icon: PlusCircle,
        },
        {
          title: "My Dashboard",
          url: createPageUrl("CustomerDashboard"),
          icon: Car,
        },
        {
          title: "My Profile",
          url: createPageUrl("UserProfile"),
          icon: UserIcon,
        }
      ];
    }

    if (user.user_type === "dealer") {
      return [
        ...baseItems,
        walletItem,
        {
          title: "Register VIN",
          url: createPageUrl("RegisterVIN"),
          icon: PlusCircle,
        },
        {
          title: "Dealer Dashboard",
          url: createPageUrl("DealerDashboard"),
          icon: Building,
        },
        {
          title: "My Profile",
          url: createPageUrl("UserProfile"),
          icon: UserIcon,
        }
      ];
    }

    if (user.user_type === "shop_owner") {
      return [
        ...baseItems,
        walletItem,
        {
          title: "Shop Dashboard",
          url: createPageUrl("ShopDashboard"),
          icon: Store,
        },
        {
          title: "My Profile",
          url: createPageUrl("UserProfile"),
          icon: UserIcon,
        }
      ];
    }

    return [...baseItems, walletItem];
  };

  const navigationItems = getNavigationItems();

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };
  
  // handleDisconnect function has been removed.

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    alert("Address copied to clipboard!");
  };

  if (isLoading && !isHomePage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-xl">Loading VINmint...</p>
        </div>
      </div>
    );
  }

  if (isHomePage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Sidebar className="border-r border-purple-500/30 bg-slate-950/95 backdrop-blur-xl">
          <SidebarHeader className="border-b border-purple-500/30 p-6 bg-slate-950/90">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" 
                  alt="VINmint Logo"
                  className="w-10 h-10 rounded-xl"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  VINmint
                </h2>
                <p className="text-xs text-slate-300">Vehicle Identity on Solana</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4 bg-slate-950/90">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-white uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-500/30 hover:text-white transition-all duration-300 rounded-lg mb-1 group ${
                          location.pathname === item.url ? 'bg-purple-500/40 text-white shadow-lg shadow-purple-500/25' : 'text-slate-100'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-purple-500/30 p-4 bg-slate-950/90 flex flex-col gap-4">
            {user ? (
              user.wallet_address ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">Wallet Connected</p>
                          <p className="text-slate-300 text-xs truncate">
                            {user.wallet_address}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={refreshBalances}
                        disabled={isBalanceLoading}
                        className="text-slate-400 hover:text-white p-1 flex-shrink-0"
                      >
                        <RefreshCw className={`w-3 h-3 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    
                    {/* Live Balances */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col items-center p-2 bg-slate-700/50 rounded-md">
                        <div className="flex items-center gap-1 mb-1">
                          <SolanaLogoSmall />
                          <span className="text-slate-400 text-xs">SOL</span>
                        </div>
                        {isBalanceLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                        ) : (
                          <span className="font-semibold text-green-300 text-xs">
                            {liveBalances.sol.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center p-2 bg-slate-700/50 rounded-md">
                        <div className="flex items-center gap-1 mb-1">
                          <VinTokenLogoSmall />
                          <span className="text-slate-400 text-xs">VIN</span>
                        </div>
                        {isBalanceLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                        ) : (
                          <span className="font-semibold text-blue-300 text-xs">
                            {liveBalances.vin.toFixed(6)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Copy button */}
                    <div className="mt-3">
                       <Button size="sm" variant="secondary" onClick={() => copyAddress(user.wallet_address)} className="w-full text-slate-300 bg-slate-700/50 hover:bg-slate-700">
                          <Copy className="w-4 h-4 mr-2" /> Copy Address
                       </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                </div>
              ) : (
                 <div className="space-y-3">
                    <Link to={createPageUrl("Wallet")} className="w-full">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white">
                          <Wallet className="w-4 h-4 mr-2"/> Create Wallet
                      </Button>
                    </Link>
                    <Button 
                        onClick={handleLogout}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                 </div>
              )
            ) : (
              <Button 
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-0"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In / Register
              </Button>
            )}
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                © {new Date().getFullYear()} Isolex Corporation. All Rights Reserved.
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-purple-500/20 p-2 rounded-lg transition-colors duration-200 text-white" />
              <h1 className="text-xl font-semibold text-white">VINmint</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        
        {/* Real Notification System */}
        <NotificationSystem 
          notifications={notifications}
          onClear={handleClearNotification}
          onClearAll={handleClearAllNotifications}
        />
      </div>
    </SidebarProvider>
  );
}