export default function getWalletViewProfile(walletAddress) {
  if (!walletAddress) return null;
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem(`vinmint_profile_${walletAddress}`) || '{}') || {};
  } catch {
    // An invalid local display profile must not break wallet navigation.
  }
  return {
    wallet_address: walletAddress,
    user_type: profile.user_type || 'vehicle_owner',
    full_name: profile.full_name || '',
    profile_completed: Boolean(profile.profile_completed),
  };
}