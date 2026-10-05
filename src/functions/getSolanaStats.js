import { base44 } from '@/api/base44Client';

export const getSolanaStats = (payload = {}) => base44.functions.invoke('getSolanaStats', payload);
export default getSolanaStats;