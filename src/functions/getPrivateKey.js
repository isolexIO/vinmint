import { base44 } from '@/api/base44Client';

export const getPrivateKey = (payload = {}) => base44.functions.invoke('getPrivateKey', payload);
export default getPrivateKey;