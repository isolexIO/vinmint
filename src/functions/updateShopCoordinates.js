import { base44 } from '@/api/base44Client';

export const updateShopCoordinates = (payload = {}) => base44.functions.invoke('updateShopCoordinates', payload);
export default updateShopCoordinates;