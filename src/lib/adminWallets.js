// Admin wallet allowlist — these wallets are recognized as admins on connect.
export const ADMIN_WALLETS = [
  "8v235MTVaExbJzj24mCzYQZLQ8z4ktqNqyPYhreytpXB",
];

export function isAdminWallet(address) {
  if (!address) return false;
  return ADMIN_WALLETS.includes(address);
}