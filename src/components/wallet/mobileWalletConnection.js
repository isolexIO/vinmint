export const isMobile = typeof navigator !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

export function getInjectedProvider(type) {
  if (typeof window === 'undefined') return null;
  if (type === 'phantom') {
    return window.phantom?.solana?.isPhantom ? window.phantom.solana :
      window.solana?.isPhantom ? window.solana : null;
  }
  if (type === 'solflare') {
    return window.solflare?.isSolflare ? window.solflare :
      window.solana?.isSolflare ? window.solana : null;
  }
  if (type === 'backpack') {
    return window.backpack?.solana || window.backpack ||
      (window.solana?.isBackpack ? window.solana : null);
  }
  return null;
}

export default function mobileWalletConnection(type) {
  const browseLinks = {
    phantom: 'https://phantom.com/ul/browse/',
    solflare: 'https://solflare.com/ul/v1/browse/',
    backpack: 'https://backpack.app/ul/v1/browse/',
  };
  // A wallet browser cannot inherit the editor's embedded preview session.
  const origin = window.self !== window.top ? 'https://vinmint.base44.app' : window.location.origin;
  // Start with a clean URL so login tokens are never passed to another app.
  const target = new URL('/WalletLogin', origin);
  target.searchParams.set('connectWallet', type);
  return `${browseLinks[type]}${encodeURIComponent(target.href)}?ref=${encodeURIComponent(origin)}`;
}