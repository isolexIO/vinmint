import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useWallet } from '@/lib/WalletContext';
import { useAuth } from '@/lib/AuthContext';

export default function WalletAccess({ children }) {
  const { isConnected, isRestoring } = useWallet();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  if (isRestoring || isLoadingAuth) {
    return <div className="min-h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Restoring your wallet" /></div>;
  }
  // Navigation only: a connected wallet never replaces server-side authorization.
  if (!isConnected && !isAuthenticated) {
    const query = new URLSearchParams({ next: location.pathname });
    const invitation = new URLSearchParams(location.search).get('invite_token');
    if (invitation && location.pathname === '/ProfileSetup') query.set('invite_token', invitation);
    return <Navigate to={`/WalletLogin?${query}`} replace />;
  }
  return children;
}