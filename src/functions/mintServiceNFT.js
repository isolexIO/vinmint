import { base44 } from '@/api/base44Client';

export const mintServiceNFT = (payload = {}) => base44.functions.invoke('mintServiceNFT', payload);
export default mintServiceNFT;