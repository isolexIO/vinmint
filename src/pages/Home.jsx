
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/entities/User";
import { getSolanaStats } from "@/functions/getSolanaStats";
import { 
  Car, 
  Shield, 
  Search, 
  Zap, 
  Globe, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Database,
  LogIn,
  Building,
  PlusCircle // Added PlusCircle import
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    vehicles: 0,
    shops: 0,
    dealers: 0,
    serviceRecords: 0,
    solanaStats: null
  });

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me().catch(() => null);
      setUser(userData);

      const statsResponse = await getSolanaStats();
      
      if (statsResponse.data.success) {
        setStats({
          vehicles: statsResponse.data.app_stats.registered_vehicles,
          shops: statsResponse.data.app_stats.certified_shops,
          dealers: statsResponse.data.app_stats.certified_dealers,
          serviceRecords: statsResponse.data.app_stats.service_records,
          solanaStats: statsResponse.data.solana_stats
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      // Use loginWithRedirect for proper authentication flow
      const currentUrl = window.location.href;
      await User.loginWithRedirect(currentUrl);
    } catch (error) {
      console.error("Login failed:", error);
      // Fallback to basic login if redirect fails
      try {
        await User.login();
        const userData = await User.me();
        setUser(userData);
      } catch (fallbackError) {
        console.error("Fallback login also failed:", fallbackError);
        alert("Login failed. Please try again or contact support.");
      }
    }
  };

  const features = [
    {
      icon: Car,
      title: "VIN NFT Certificates",
      description: "Mint your vehicle's VIN as a .VINmint domain and receive a unique NFT certificate that proves ownership on the Solana blockchain.",
      color: "from-purple-500 to-blue-500",
      price: "490 $VIN"
    },
    {
      icon: Shield,
      title: "Certified Service Records",
      description: "Only VINmint-certified shops can issue service record NFTs, ensuring authentic and verifiable maintenance history on Solana.",
      color: "from-blue-500 to-cyan-500",
      price: "10 $VIN per NFT"
    },
    {
      icon: Database,
      title: "Immutable History",
      description: "All vehicle data and service records are stored permanently on the Solana blockchain, creating an unalterable history that follows your vehicle.",
      color: "from-cyan-500 to-teal-500",
      price: "Free to view"
    },
    {
      icon: Globe,
      title: "Transferable Ownership",
      description: "When you sell your vehicle, simply transfer the VIN NFT to the new owner along with complete service history, all recorded on Solana.",
      color: "from-teal-500 to-green-500",
      price: "Transfer fees apply"
    }
  ];

  const liveStats = [
    { 
      label: "Registered .VINmint Domains", 
      value: stats.vehicles.toLocaleString(), 
      icon: Car,
      sublabel: "On Solana Blockchain"
    },
    { 
      label: "Certified Shops", 
      value: stats.shops.toLocaleString(), 
      icon: Shield,
      sublabel: "Verified Partners"
    },
    { 
      label: "Service NFTs", 
      value: stats.serviceRecords.toLocaleString(), 
      icon: Database,
      sublabel: "Minted on Solana"
    },
    { 
      label: "Certified Dealers", 
      value: stats.dealers.toLocaleString(), 
      icon: Building,
      sublabel: "Across the network"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <header className="text-center mb-20"> {/* Changed section to header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" 
              alt="VINmint Logo"
              className="w-32 h-32 mx-auto mb-6 rounded-full"
            />
            <h1 className="text-6xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent leading-tight">
              VINmint
            </h1>
            <p className="text-3xl lg:text-4xl text-slate-300 mb-8 font-light">
              Vehicle Identity on Solana Blockchain
            </p>
            <p className="text-xl lg:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              The future of automotive transparency. Register your VIN as a Solana domain, 
              collect verified service records as NFTs, and build trust in the vehicle ecosystem.
            </p>

            {/* $VIN Token Pricing Banner */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 mt-12 mb-8 border border-purple-500/30">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c843bc89d0e71e79dfc721/3ecf32e8e_493130015_122093779586861598_4848437929607844438_n.jpg" alt="VIN Token" className="w-8 h-8 rounded-full" />
                <h3 className="text-2xl font-bold text-white">$VIN Token Pricing</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-300 mb-2">490 $VIN</div>
                  <div className="text-slate-300">VIN Registration</div>
                  <div className="text-sm text-slate-400">One-time platform fee (~$49.00)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-300 mb-2">10 $VIN</div>
                  <div className="text-slate-300">Service NFT Minting</div>
                  <div className="text-sm text-slate-400">Per NFT minted (~$1.00)</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">$VIN Token Contract:</p>
                <p className="text-xs text-green-400 font-mono break-all">DkorbGQdBUBcwFbXejktt3gxgBsM4YDENb5xoQzYC5xg</p>
                <p className="text-xs text-purple-300 mt-1">Current Price: $0.10 USD</p>
              </div>
            </div>

            {/* Replaced button section */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              {!isLoading && user ? (
                <Link to={createPageUrl("RegisterVIN")}>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-xl text-2xl font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group border-0">
                    <Lock className="w-6 h-6 mr-3" />
                    Register Your VIN
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={handleLogin}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-xl text-2xl font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group border-0"
                >
                  <LogIn className="w-6 h-6 mr-3" />
                  Get Started Now
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              )}
            </div>
          </motion.div>
        </header>

      {/* Live Stats Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Live Solana Network Statistics</h2>
            <p className="text-slate-400">Real-time data from the blockchain</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {liveStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-xl">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">
                      {isLoading ? "..." : stat.value}
                    </div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                    <div className="text-slate-500 text-xs mt-1">{stat.sublabel}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Revolutionary Features
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              VINmint leverages the power of Solana blockchain to create a new standard for vehicle identity and service verification.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <Card className="bg-slate-800/30 border-purple-500/20 backdrop-blur-xl hover:bg-slate-800/50 transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {feature.price}
                      </Badge>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">{feature.title}</h3>
                    <p className="text-base lg:text-lg text-slate-300 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              How It Works
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Register Your VIN",
                description: "Enter your vehicle's VIN to mint a .VINmint domain and receive an NFT certificate on Solana blockchain",
                icon: Car
              },
              {
                step: "02", 
                title: "Service at Certified Shops",
                description: "Get your vehicle serviced at VINmint-certified shops who will mint service record NFTs on Solana",
                icon: Shield
              },
              {
                step: "03",
                title: "Build Verifiable History",
                description: "Accumulate immutable service records on Solana that increase your vehicle's value and trustworthiness",
                icon: CheckCircle
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-purple-300 font-bold text-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Ready to Transform Your Vehicle?
            </h2>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Join the revolution and give your vehicle a permanent, verifiable identity on the Solana blockchain.
            </p>
            
            {!isLoading && user ? (
              <Link to={createPageUrl("RegisterVIN")}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-xl text-2xl font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group border-0">
                  <Lock className="w-6 h-6 mr-3" />
                  Register Your VIN
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleLogin}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-xl text-2xl font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group border-0"
              >
                <LogIn className="w-6 h-6 mr-3" />
                Get Started Now
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            )}
          </motion.div>
        </div>
      </section>
      </div>
    </div>
  );
}
