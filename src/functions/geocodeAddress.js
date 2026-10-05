import { base44 } from '@/api/base44Client';

export const geocodeAddress = (payload = {}) => base44.functions.invoke('geocodeAddress', payload);
export default geocodeAddress;