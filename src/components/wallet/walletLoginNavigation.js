import getWalletViewProfile from '@/components/wallet/getWalletViewProfile';
import { isAdminWallet } from '@/lib/adminWallets';

const destinations = ['/Wallet', '/RegisterVIN', '/ProfileSetup', '/CustomerDashboard', '/DealerDashboard', '/ShopDashboard', '/AdminPanel', '/UserProfile'];

export function getLoginReturnPath(search = window.location.search) {
  const next = new URLSearchParams(search).get('next');
  return destinations.includes(next) ? next : null;
}

export function getAccountDashboard(user, walletAddress) {
  if (isAdminWallet(walletAddress) || user.user_type === 'admin') return '/AdminPanel';
  // Wallet navigation does not require an email-backed account or onboarding.
  if (user.user_type === 'dealer') return '/DealerDashboard';
  if (user.user_type === 'shop_owner') return '/ShopDashboard';
  return '/CustomerDashboard';
}

export default async function walletLoginNavigation(walletAddress, next) {
  const invitation = new URLSearchParams(window.location.search).get('invite_token');
  const profile = getWalletViewProfile(walletAddress);
  const destination = next || getAccountDashboard(profile, walletAddress);
  return destination === '/ProfileSetup' && invitation
    ? `${destination}?${new URLSearchParams({ invite_token: invitation })}`
    : destination;
}