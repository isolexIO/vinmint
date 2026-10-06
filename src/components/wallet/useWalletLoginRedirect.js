import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/lib/WalletContext';
import walletLoginNavigation, { getLoginReturnPath } from '@/components/wallet/walletLoginNavigation';

export default function useWalletLoginRedirect(onError) {
  const { isConnected, isRestoring, walletAddress } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const inFlight = useRef(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const continueLogin = useCallback(async () => {
    if (!walletAddress || isRestoring || inFlight.current) return;
    inFlight.current = true;
    setIsFinishing(true);
    onError(null);
    try {
      const destination = await walletLoginNavigation(walletAddress, getLoginReturnPath(location.search));
      if (destination) navigate(destination, { replace: true });
    } catch (error) {
      onError(error.response?.data?.message || error.message || 'Could not finish signing in. Please try again.');
    } finally {
      inFlight.current = false;
      setIsFinishing(false);
    }
  }, [walletAddress, isRestoring, location.search, navigate, onError]);
  useEffect(() => {
    if (isConnected && !isRestoring) continueLogin();
  }, [isConnected, isRestoring, continueLogin]);
  return { continueLogin, isFinishing };
}