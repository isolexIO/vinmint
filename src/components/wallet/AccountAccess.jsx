import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AccountAccess({ children }) {
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) {
    return <div className="min-h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Checking your account" /></div>;
  }
  if (!isAuthenticated) {
    if (authError && !['auth_required', 'user_not_registered'].includes(authError.type)) {
      return <p role="alert" className="p-6 text-destructive">{authError.message}</p>;
    }
    const next = location.pathname;
    const query = new URLSearchParams({ next });
    const invitation = new URLSearchParams(location.search).get('invite_token');
    if (invitation && next === '/ProfileSetup') query.set('invite_token', invitation);
    return <Navigate to={`/WalletLogin?${query}`} replace />;
  }
  return children;
}