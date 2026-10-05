import { base44 } from '@/api/base44Client';

export const transferTokens = (payload = {}) => base44.functions.invoke('transferTokens', payload);
export default transferTokens;