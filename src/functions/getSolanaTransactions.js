import { base44 } from '@/api/base44Client';

export const getSolanaTransactions = (payload = {}) => base44.functions.invoke('getSolanaTransactions', payload);
export default getSolanaTransactions;