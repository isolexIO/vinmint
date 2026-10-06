import { base44 } from '@/api/base44Client';
import { isAdminWallet } from '@/lib/adminWallets';

const destinations = ['/Wallet', '/RegisterVIN', '/ProfileSetup', '/CustomerDashboard', '/DealerDashboard', '/ShopDashboard', '/AdminPanel', '/UserProfile'];

export function getLoginReturnPath(search = window.location.search) {
  const next = new URLSearchParams(search).get('next');
  return destinations.includes(next) ? next : null;
}

export function getAccountDashboard(user, walletAddress) {
  if (isAdminWallet(walletAddress) || user.user_type === 'admin') return '/AdminPanel';
  if (!user.profile_completed) return '/ProfileSetup';
  if (user.user_type === 'dealer') return '/DealerDashboard';
  if (user.user_type === 'shop_owner') return '/ShopDashboard';
  return '/CustomerDashboard';
}

export default async function walletLoginNavigation(walletAddress, next) {
  const invitation = new URLSearchParams(window.location.search).get('invite_token');
  if (!await base44.auth.isAuthenticated()) {
    const returnUrl = new URL('/WalletLogin', window.location.origin);
    if (next) returnUrl.searchParams.set('next', next);
    if (invitation && next === '/ProfileSetup') returnUrl.searchParams.set('invite_token', invitation);
    base44.auth.redirectToLogin(returnUrl.href);
    return null;
  }
  let user = await base44.auth.me();
  // Connecting a wallet must never replace an account's existing wallet or keys.
  if (!user.wallet_address) {
    await base44.auth.updateMe({ wallet_address: walletAddress });
    user = await base44.auth.me();
  }
  localStorage.setItem(`vinmint_profile_${walletAddress}`, JSON.stringify({
    user_type: user.user_type || 'vehicle_owner',
    profile_completed: Boolean(user.profile_completed),
    shop_id: user.shop_id,
    business_domain: user.business_domain,
  }));
  const destination = next || getAccountDashboard(user, walletAddress);
  return destination === '/ProfileSetup' && invitation
    ? `${destination}?${new URLSearchParams({ invite_token: invitation })}`
    : destination;
}