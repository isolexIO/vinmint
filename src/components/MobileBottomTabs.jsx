import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Search, Wallet, LayoutDashboard } from "lucide-react";

export default function MobileBottomTabs({ dashboardUrl }) {
  const location = useLocation();

  const tabs = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Explorer", url: createPageUrl("Explorer"), icon: Search },
    { title: "Dashboard", url: dashboardUrl || createPageUrl("CustomerDashboard"), icon: LayoutDashboard },
    { title: "Wallet", url: createPageUrl("Wallet"), icon: Wallet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-purple-500/30 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.url;
          return (
            <Link
              key={tab.title}
              to={tab.url}
              className={`flex flex-col items-center justify-center min-h-11 min-w-11 px-3 py-1 transition-colors duration-200 ${
                isActive ? "text-purple-400" : "text-slate-400"
              }`}
            >
              <tab.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}