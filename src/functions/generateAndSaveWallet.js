import { base44 } from '@/api/base44Client';

export const generateAndSaveWallet = (payload = {}) => base44.functions.invoke('generateAndSaveWallet', payload);
export default generateAndSaveWallet;