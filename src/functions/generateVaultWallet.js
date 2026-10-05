import { base44 } from '@/api/base44Client';

export const generateVaultWallet = (payload = {}) => base44.functions.invoke('generateVaultWallet', payload);
export default generateVaultWallet;