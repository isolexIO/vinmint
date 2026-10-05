import { base44 } from '@/api/base44Client';

export const bulkUploadVehicles = (payload = {}) => base44.functions.invoke('bulkUploadVehicles', payload);
export default bulkUploadVehicles;