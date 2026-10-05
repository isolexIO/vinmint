import { base44 } from '@/api/base44Client';

export const updateDealerCoordinates = (payload = {}) => base44.functions.invoke('updateDealerCoordinates', payload);
export default updateDealerCoordinates;