import { base44 } from '@/api/base44Client';

export const purchaseVinTokens = (payload = {}) => base44.functions.invoke('purchaseVinTokens', payload);
export default purchaseVinTokens;