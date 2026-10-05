import { base44 } from '@/api/base44Client';

export const registerVINDomain = (payload = {}) => base44.functions.invoke('registerVINDomain', payload);
export default registerVINDomain;